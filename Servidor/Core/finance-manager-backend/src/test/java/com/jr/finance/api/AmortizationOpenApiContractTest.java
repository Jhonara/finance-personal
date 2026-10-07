package com.jr.finance.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AmortizationOpenApiContractTest {
    @Autowired private MockMvc mvc;

    @Test
    void publishesOwnedCreditAmortizationContracts() throws Exception {
        String document = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(document).contains("/api/v1/credits/{id}/amortization");
        assertThat(document).contains("CreditAmortizationResponse", "CreditAmortizationScenarioResponse");
        String output = System.getProperty("amortization.openapi.output");
        if (output != null) Files.writeString(Path.of(output), document);
    }
}
