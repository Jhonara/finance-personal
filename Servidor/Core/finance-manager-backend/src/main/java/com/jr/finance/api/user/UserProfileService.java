package com.jr.finance.api.user;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.user.dto.CurrentUserResponse;
import com.jr.finance.api.user.dto.UpdateProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {
    private final UserRepository users;

    @Transactional
    public CurrentUserResponse update(Long authenticatedUserId, UpdateProfileRequest request) {
        User user = users.findById(authenticatedUserId).orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        applyNames(user, request.firstName(), request.lastName(), request.displayName());
        return CurrentUserResponse.from(users.save(user));
    }

    /** Explicit fields only. A legacy full name is never split or inferred. */
    public static void applyNames(User user, String first, String last, String display) {
        first = clean(first, 100, "El nombre");
        last = clean(last, 100, "Los apellidos");
        display = clean(display, 50, "El nombre mostrado");
        if (last != null && first == null) throw new BadRequestException("Indica tu nombre para guardar los apellidos.");
        String full = first == null ? user.getName() : first + (last == null ? "" : " " + last);
        if (full == null || full.isBlank() || full.length() > 100)
            throw new BadRequestException("El nombre y los apellidos juntos deben tener entre 1 y 100 caracteres.");
        user.setName(full);
        user.setFirstName(first);
        user.setLastName(last);
        user.setDisplayName(display);
    }

    private static String clean(String value, int max, String label) {
        if (value == null || value.isBlank()) return null;
        value = value.trim();
        if (value.length() > max) throw new BadRequestException(label + " supera el largo permitido.");
        return value;
    }
}
