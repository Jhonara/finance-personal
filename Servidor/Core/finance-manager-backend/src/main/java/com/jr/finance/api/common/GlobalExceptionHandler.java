package com.jr.finance.api.common;

import com.jr.finance.api.common.dto.ErrorResponse;
import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.ForbiddenException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.common.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            NotFoundException ex,
            HttpServletRequest request) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(error(
                        ex.getMessage(),
                        HttpStatus.NOT_FOUND,
                        request
                ));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(
            BadRequestException ex,
            HttpServletRequest request) {

        return ResponseEntity.badRequest()
                .body(error(
                        ex.getMessage(),
                        HttpStatus.BAD_REQUEST,
                        request
                ));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(
            ConflictException ex,
            HttpServletRequest request) {

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error(
                        ex.getMessage(),
                        HttpStatus.CONFLICT,
                        request
                ));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(
            ObjectOptimisticLockingFailureException ex,
            HttpServletRequest request) {

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error(
                        "El recurso fue modificado por otra operación. Intenta nuevamente.",
                        HttpStatus.CONFLICT,
                        request
                ));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(
            UnauthorizedException ex,
            HttpServletRequest request) {

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(error(
                        ex.getMessage(),
                        HttpStatus.UNAUTHORIZED,
                        request
                ));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(
            ForbiddenException ex,
            HttpServletRequest request) {

        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(error(
                        ex.getMessage(),
                        HttpStatus.FORBIDDEN,
                        request
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        return ResponseEntity.badRequest()
                .body(error(
                        message,
                        HttpStatus.BAD_REQUEST,
                        request
                ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(
            ConstraintViolationException ex,
            HttpServletRequest request) {

        return ResponseEntity.badRequest()
                .body(error(
                        ex.getMessage(),
                        HttpStatus.BAD_REQUEST,
                        request
                ));
    }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleJsonParse(
            org.springframework.http.converter.HttpMessageNotReadableException ex,
            HttpServletRequest request) {

        return ResponseEntity.badRequest()
                .body(error(
                        "El cuerpo de la solicitud contiene un JSON inválido.",
                        HttpStatus.BAD_REQUEST,
                        request
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(
            Exception ex,
            HttpServletRequest request) {

        log.error("Error no controlado al procesar {} {}", request.getMethod(), request.getRequestURI(), ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error(
                        "Ocurrió un error interno.",
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        request
                ));
    }

    private ErrorResponse error(
            String message,
            HttpStatus status,
            HttpServletRequest request) {

        return new ErrorResponse(
                message,
                status.name(),
                status.value(),
                LocalDateTime.now(),
                request.getRequestURI()
        );
    }

}
