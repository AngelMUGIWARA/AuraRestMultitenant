import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  guestName: {
    isString: 'El nombre del cliente debe ser texto',
    isNotEmpty: 'El nombre del cliente es requerido',
    matches: 'El nombre solo puede contener letras, espacios, guiones y apóstrofes',
  },
  guestPhone: {
    isString: 'El teléfono debe ser texto',
    isNotEmpty: 'El teléfono es requerido',
  },
  guestEmail: {
    isEmail: 'El correo electrónico no es válido',
  },
  partySize: {
    isInt: 'El número de personas debe ser un número entero',
    min: 'El número de personas debe ser al menos 1',
    isNumber: 'El número de personas debe ser un número',
  },
  date: {
    isString: 'La fecha debe ser texto',
    isNotEmpty: 'La fecha es requerida',
    matches: 'La fecha debe estar en formato YYYY-MM-DD',
  },
  time: {
    isString: 'La hora debe ser texto',
    isNotEmpty: 'La hora es requerida',
    matches: 'La hora debe estar en formato HH:MM',
  },
  branchId: {
    isString: 'La sucursal debe ser texto',
    isNotEmpty: 'La sucursal es requerida',
  },
  tableId: {
    isString: 'La mesa debe ser texto',
    isNotEmpty: 'La mesa es requerida',
  },
  durationMinutes: {
    isInt: 'La duración debe ser un número entero',
    min: 'La duración mínima es 15 minutos',
    max: 'La duración máxima es 480 minutos',
  },
  notes: {
    isString: 'Las notas deben ser texto',
  },
};

function getFriendlyErrorMessage(property: string, constraint: string, rawMessage?: string): string {
  if (ERROR_MESSAGES[property]?.[constraint]) {
    return ERROR_MESSAGES[property][constraint];
  }

  if (rawMessage && property) {
    return rawMessage;
  }

  return `Error en el campo ${property}`;
}

function processValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  return errors.reduce((acc, error) => {
    const constraints = error.constraints || {};
    const friendlyMessages = Object.entries(constraints).map(
      ([key, value]) =>
        getFriendlyErrorMessage(error.property, key, value),
    );
    acc[error.property] = friendlyMessages;
    return acc;
  }, {} as Record<string, string[]>);
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const messageField = exceptionResponse.message;

      if (Array.isArray(messageField)) {
        const errors = processValidationErrors(messageField as ValidationError[]);
        return response.status(400).json({
          statusCode: 400,
          message:
            Object.values(errors).flat().join('; ') ||
            'Los datos enviados no son válidos',
          errors,
          timestamp: new Date().toISOString(),
        });
      }
    }

    response.status(exception.getStatus()).json(exceptionResponse);
  }
}
