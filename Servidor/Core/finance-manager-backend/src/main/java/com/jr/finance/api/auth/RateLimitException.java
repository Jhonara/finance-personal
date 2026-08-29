package com.jr.finance.api.auth;

public class RateLimitException extends RuntimeException {
    private final long retryAfterSeconds;
    public RateLimitException(long retryAfterSeconds) { this.retryAfterSeconds = retryAfterSeconds; }
    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
