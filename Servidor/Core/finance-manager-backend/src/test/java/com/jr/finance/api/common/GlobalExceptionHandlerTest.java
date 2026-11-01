package com.jr.finance.api.common;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new MethodTestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PUT"})
    void unsupportedLoginMethodsReturn405WithAllowedMethodAndStandardErrorBody(String method) throws Exception {
        mvc.perform(request(HttpMethod.valueOf(method), "/api/v1/auth/login"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string(HttpHeaders.ALLOW, "POST"))
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.message").value("Esta operación no admite el método solicitado."))
                .andExpect(jsonPath("$.path").value("/api/v1/auth/login"))
                .andExpect(jsonPath("$.fieldErrors").isEmpty());
    }

    @Test
    void preservesEverySupportedMethodInTheAllowHeader() throws Exception {
        mvc.perform(put("/method-test/multiple"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string(HttpHeaders.ALLOW, containsString("GET")))
                .andExpect(header().string(HttpHeaders.ALLOW, containsString("POST")));
    }

    @Test
    void keepsTheSupportedPostOperationAvailable() throws Exception {
        mvc.perform(post("/api/v1/auth/login"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(true));
    }

    @Test
    void missingRequiredQueryParameterReturns400AndItsFieldName() throws Exception {
        mvc.perform(get("/method-test/period"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.month").value("Este dato es obligatorio."));
    }

    @Test
    void invalidQueryParameterTypeReturns400InsteadOfAnInternalError() throws Exception {
        mvc.perform(get("/method-test/period?month=octubre"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.month").value("Revisa este valor."));
    }

    @Test
    void invalidPathIdentifierReturns400InsteadOfAnInternalError() throws Exception {
        mvc.perform(get("/method-test/accounts/not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.id").value("Revisa este valor."));
    }

    @RestController
    static class MethodTestController {
        @GetMapping("/method-test/period")
        Map<String, Integer> period(@RequestParam int month) {
            return Map.of("month", month);
        }

        @GetMapping("/method-test/accounts/{id}")
        Map<String, Long> account(@PathVariable Long id) {
            return Map.of("id", id);
        }

        @PostMapping("/api/v1/auth/login")
        Map<String, Boolean> login() {
            return Map.of("accepted", true);
        }

        @RequestMapping(path = "/method-test/multiple", method = {RequestMethod.GET, RequestMethod.POST})
        Map<String, Boolean> multipleMethods() {
            return Map.of("accepted", true);
        }
    }
}
