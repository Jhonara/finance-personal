package com.jr.finance.api;

import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.user.Role;
import com.jr.finance.api.user.RoleRepository;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountIntegrationTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AccountRepository accountRepository;

    @BeforeEach
    void cleanDatabase() {
        accountRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
    }

    @Test
    void createsAnActiveAccountWithTheRequestedTypeAndCurrency() throws Exception {
        User user = createUser();

        mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  Bancolombia  \",\"type\":\"BANK\",\"currency\":\"COP\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bancolombia"))
                .andExpect(jsonPath("$.type").value("BANK"))
                .andExpect(jsonPath("$.currency").value("COP"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.version").value(0));
    }

    @Test
    void rejectsInvalidAndDuplicateAccounts() throws Exception {
        User user = createUser();
        String authorization = bearer(user);

        mockMvc.perform(post("/api/v1/accounts").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \",\"type\":\"BANK\",\"currency\":\"COP\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/accounts").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Wallet\",\"type\":\"CREDIT_CARD\",\"currency\":\"COP\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/accounts").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Wallet\",\"type\":\"DIGITAL_WALLET\",\"currency\":\"CO\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/accounts").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Wallet\",\"type\":\"DIGITAL_WALLET\",\"currency\":\"COP\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/accounts").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Wallet\",\"type\":\"DIGITAL_WALLET\",\"currency\":\"COP\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void isolatesAccountsByOwnerForListGetAndPatch() throws Exception {
        User owner = createUser();
        User other = createUser();
        Long ownerAccountId = createAccount(owner, "Owner account");
        Long otherAccountId = createAccount(other, "Other account");

        mockMvc.perform(get("/api/v1/accounts").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(ownerAccountId));
        mockMvc.perform(get("/api/v1/accounts/{id}", otherAccountId).header("Authorization", bearer(owner)))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/v1/accounts/{id}", otherAccountId).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false,\"version\":0}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updatesMetadataStatusAndRejectsStaleVersions() throws Exception {
        User user = createUser();
        Long accountId = createAccount(user, "Cash");
        String authorization = bearer(user);

        mockMvc.perform(patch("/api/v1/accounts/{id}", accountId).header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Daily cash\",\"type\":\"CASH\",\"active\":false,\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Daily cash"))
                .andExpect(jsonPath("$.type").value("CASH"))
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.version").value(1));
        mockMvc.perform(patch("/api/v1/accounts/{id}", accountId).header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":true,\"version\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.version").value(2));
        mockMvc.perform(patch("/api/v1/accounts/{id}", accountId).header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false,\"version\":0}"))
                .andExpect(status().isConflict());
        mockMvc.perform(patch("/api/v1/accounts/{id}", accountId).header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currency\":\"USD\",\"version\":2}"))
                .andExpect(status().isBadRequest());
    }

    private User createUser() {
        Role role = roleRepository.findByName("USER").orElseGet(() -> {
            Role created = new Role();
            created.setName("USER");
            return roleRepository.save(created);
        });
        User user = new User();
        user.setName("Account Test");
        user.setEmail("account-" + UUID.randomUUID() + "@test.local");
        user.setPassword(passwordEncoder.encode("password123"));
        user.getRoles().add(role);
        return userRepository.save(user);
    }

    private Long createAccount(User user, String name) throws Exception {
        String response = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"%s\",\"type\":\"BANK\",\"currency\":\"COP\"}".formatted(name)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return Long.valueOf(response.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }
}
