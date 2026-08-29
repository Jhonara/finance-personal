package com.jr.finance.api.common;

import com.jr.finance.api.auth.RateLimitException;
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
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
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
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex, HttpServletRequest request) { return response(ex.getMessage(), "NOT_FOUND", HttpStatus.NOT_FOUND, request); }
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex, HttpServletRequest request) { return response(ex.getMessage(), "BAD_REQUEST", HttpStatus.BAD_REQUEST, request); }
    @ExceptionHandler({ConflictException.class, ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<ErrorResponse> handleConflict(Exception ex, HttpServletRequest request) {
        String message = ex instanceof ObjectOptimisticLockingFailureException ? "El recurso fue modificado por otra operación. Intenta nuevamente." : ex.getMessage();
        return response(message, "CONFLICT", HttpStatus.CONFLICT, request);
    }
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex, HttpServletRequest request) { return response(ex.getMessage(), "UNAUTHORIZED", HttpStatus.UNAUTHORIZED, request); }
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException ex, HttpServletRequest request) { return response(ex.getMessage(), "FORBIDDEN", HttpStatus.FORBIDDEN, request); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream().collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (first, ignored) -> first, LinkedHashMap::new));
        return response("Request validation failed", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST, request, fields);
    }
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException ex, HttpServletRequest request) { return response("Request validation failed", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST, request); }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleJsonParse(HttpServletRequest request) { return response("El cuerpo de la solicitud contiene un JSON inválido.", "INVALID_REQUEST_BODY", HttpStatus.BAD_REQUEST, request); }
    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ErrorResponse> handleRateLimit(RateLimitException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", String.valueOf(ex.getRetryAfterSeconds())).body(error("Too many attempts. Try again later.", "RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, request, Map.of()));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception ex, HttpServletRequest request) {
        log.error("Error no controlado al procesar {} {}", request.getMethod(), request.getRequestURI(), ex);
        return response("Ocurrió un error interno.", "INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, request);
    }
    private ResponseEntity<ErrorResponse> response(String message, String code, HttpStatus status, HttpServletRequest request) { return response(message, code, status, request, Map.of()); }
    private ResponseEntity<ErrorResponse> response(String message, String code, HttpStatus status, HttpServletRequest request, Map<String, String> fields) { return ResponseEntity.status(status).body(error(message, code, status, request, fields)); }
    private ErrorResponse error(String message, String code, HttpStatus status, HttpServletRequest request, Map<String, String> fields) { return new ErrorResponse(message, code, status.value(), LocalDateTime.now(), request.getRequestURI(), fields); }
}
