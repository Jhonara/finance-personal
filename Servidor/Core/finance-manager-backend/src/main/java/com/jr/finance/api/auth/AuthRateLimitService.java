package com.jr.finance.api.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthRateLimitService {
    private final ConcurrentHashMap<String, Window> attempts = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final long windowMillis;
    private final Clock clock;

    @Autowired
    public AuthRateLimitService(@Value("${auth.rate-limit.max-attempts:5}") int maxAttempts,
                                @Value("${auth.rate-limit.window-seconds:60}") long windowSeconds) {
        this(maxAttempts, windowSeconds, Clock.systemUTC());
    }
    AuthRateLimitService(int maxAttempts, long windowSeconds, Clock clock) {
        this.maxAttempts = maxAttempts; this.windowMillis = windowSeconds * 1000; this.clock = clock;
    }
    public void check(String action, String remoteAddress, String subject) {
        String key = action + ':' + remoteAddress + ':' + (subject == null ? "" : subject.trim().toLowerCase());
        long now = clock.millis();
        Window window = attempts.computeIfAbsent(key, ignored -> new Window(now));
        synchronized (window) {
            if (now - window.startedAt >= windowMillis) { window.startedAt = now; window.count = 0; }
            if (window.count >= maxAttempts) throw new RateLimitException(Math.max(1, (windowMillis - (now - window.startedAt) + 999) / 1000));
            window.count++;
        }
    }
    private static final class Window { private long startedAt; private int count; private Window(long startedAt) { this.startedAt = startedAt; } }
}
