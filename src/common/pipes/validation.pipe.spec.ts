import { ValidationPipe } from './validation.pipe'
import { ArgumentMetadata, BadRequestException } from '@nestjs/common'
import { IsString, IsInt, Min } from 'class-validator'

class TestDto {
    @IsString()
    name: string

    @IsInt()
    @Min(1)
    age: number
}

describe('ValidationPipe', () => {
    let pipe: ValidationPipe

    beforeEach(() => {
        pipe = new ValidationPipe()
    })

    it('should be defined', () => {
        expect(pipe).toBeDefined()
    })

    it('should return value when no metatype', async () => {
        const value = { name: 'John' }

        const metadata: ArgumentMetadata = {
            type: 'body',
            metatype: undefined,
            data: '',
        }

        const result = await pipe.transform(value, metadata)

        expect(result).toEqual(value)
    })

    it('should not validate primitive types', async () => {
        const value = 'test'

        const metadata: ArgumentMetadata = {
            type: 'body',
            metatype: String,
            data: '',
        }

        const result = await pipe.transform(value, metadata)

        expect(result).toBe(value)
    })

    it('should pass validation for correct data', async () => {
        const value = {
            name: 'John',
            age: 25,
        }

        const metadata: ArgumentMetadata = {
            type: 'body',
            metatype: TestDto,
            data: '',
        }

        const result = await pipe.transform(value, metadata)

        expect(result).toEqual(value)
    })

    it('should throw BadRequestException when validation fails', async () => {
        const value = {
            name: 123,
            age: 0,
        }

        const metadata: ArgumentMetadata = {
            type: 'body',
            metatype: TestDto,
            data: '',
        }

        await expect(pipe.transform(value, metadata)).rejects.toThrow(
            BadRequestException,
        )
    })

    it('should return formatted validation errors', async () => {
        const value = {
            name: 123,
            age: 0,
        }

        const metadata: ArgumentMetadata = {
            type: 'body',
            metatype: TestDto,
            data: '',
        }

        try {
            await pipe.transform(value, metadata)
        } catch (error) {
            const response = error.getResponse() as any

            expect(response.message).toEqual([
                {
                    field: 'name',
                    errors: expect.any(Array),
                },
                {
                    field: 'age',
                    errors: expect.any(Array),
                },
            ])
        }
    })
})