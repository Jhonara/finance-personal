package com.jr.finance.api;

import com.jr.finance.api.auth.AuthService;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.auth.dto.RegisterRequest;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.user.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class UserProfileIntegrationTests {
    @Autowired MockMvc mvc; @Autowired UserRepository users; @Autowired RoleRepository roles;
    @Autowired JwtService jwt; @Autowired LedgerEntryRepository ledger; @Autowired AuthService auth;

    @Test void preservesLegacyNamesWithoutGuessingTheirParts() throws Exception {
        User user = user(); String legacy = user.getName();
        mvc.perform(get("/api/v1/me").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(legacy))
                .andExpect(jsonPath("$.firstName").isEmpty()).andExpect(jsonPath("$.lastName").isEmpty())
                .andExpect(jsonPath("$.password").doesNotExist());
    }
    @Test void updatesOnlyTheAuthenticatedProfileAndLeavesFinancialDataUntouched() throws Exception {
        User owner = user(), other = user(); long before = ledger.count(); String originalName = owner.getName();
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"  Ana  \",\"id\":" + other.getId() + ",\"email\":\"untrusted@example.test\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(owner.getId()))
                .andExpect(jsonPath("$.displayName").value("Ana")).andExpect(jsonPath("$.name").value(originalName))
                .andExpect(jsonPath("$.email").value(owner.getEmail()));
        assertThat(users.findById(other.getId()).orElseThrow().getDisplayName()).isNull();
        assertThat(ledger.count()).isEqualTo(before);
    }
    @Test void keepsCompoundGivenNamesAndSurnamesExplicitAndAllowsClearingThePreferredName() throws Exception {
        User owner = user();
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":\"María José\",\"lastName\":\"De la Cruz\",\"displayName\":\"Majo\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.firstName").value("María José"))
                .andExpect(jsonPath("$.lastName").value("De la Cruz")).andExpect(jsonPath("$.name").value("María José De la Cruz"));
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":\"María José\",\"lastName\":\"De la Cruz\",\"displayName\":\"\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").isEmpty());
    }
    @Test void validatesProfileLimitsAndRequiresAnAuthenticatedSession() throws Exception {
        User owner = user();
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"" + "x".repeat(51) + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.displayName").exists());
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"lastName\":\"Sin nombre explícito\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/me").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void acceptsTheLegacyRegistrationContract() {
        ensureRole(); RegisterRequest request = registration();
        auth.register(request);
        User saved = users.findByEmail(request.getEmail()).orElseThrow();
        assertThat(saved.getName()).isEqualTo(request.getName()); assertThat(saved.getFirstName()).isNull();
    }
    @Test void acceptsExplicitNamesAtRegistrationWithoutCollectingAdditionalPersonalData() {
        ensureRole(); RegisterRequest request = registration();
        request.setFirstName("Ana María"); request.setLastName("Del Río"); request.setDisplayName("Ana");
        auth.register(request);
        User saved = users.findByEmail(request.getEmail()).orElseThrow();
        assertThat(saved.getName()).isEqualTo("Ana María Del Río"); assertThat(saved.getDisplayName()).isEqualTo("Ana");
    }
    private RegisterRequest registration() {
        RegisterRequest request = new RegisterRequest(); request.setName("Nombre legado completo");
        request.setEmail(UUID.randomUUID() + "@example.test"); request.setPassword("test-only-password-123"); return request;
    }
    private void ensureRole() { roles.findByName("USER").orElseGet(() -> { Role role = new Role(); role.setName("USER"); return roles.save(role); }); }
    private User user() {
        ensureRole(); User user = new User(); user.setName("Nombre compuesto Del Río");
        user.setEmail(UUID.randomUUID() + "@example.test"); user.setPassword("test-only-hash");
        user.getRoles().add(roles.findByName("USER").orElseThrow()); return users.saveAndFlush(user);
    }
    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getEmail()); }
}
