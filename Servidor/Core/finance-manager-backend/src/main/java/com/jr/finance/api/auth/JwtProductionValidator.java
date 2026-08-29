package com.jr.finance.api.auth;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class JwtProductionValidator implements InitializingBean {
    private final String secret;
    public JwtProductionValidator(@Value("${jwt.secret:}") String secret) { this.secret = secret; }
    @Override public void afterPropertiesSet() {
        if (secret == null || secret.trim().length() < 32) throw new IllegalStateException("JWT_SECRET must be configured with at least 32 characters in production");
    }
}
