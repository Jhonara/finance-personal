package com.jr.finance.api.inbox;

import com.jr.finance.api.account.*;
import com.jr.finance.api.common.exception.*;
import com.jr.finance.api.user.UserRepository;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor
public class WalletCardService {
    private final WalletCardRepository cards;
    private final AccountRepository accounts;
    private final UserRepository users;
    public enum Kind { DEBIT, CREDIT }
    @Schema(name = "WalletCardInput")
    public record Input(@NotBlank @Size(max=80) String reference, @NotBlank @Size(max=80) String name,
            @NotNull Kind kind, @NotNull @Positive Long accountId) {}
    @Schema(name = "WalletCardResponse")
    public record Card(Long id, String reference, String name, Kind kind, Long accountId) {}
    @Transactional(readOnly=true)
    public List<Card> list(Long user) { return cards.findByUserIdOrderById(user).stream().map(this::response).toList(); }
    @Transactional
    public Card save(Long user, Input input) {
        users.lockForAlertUpdate(user).orElseThrow(() -> new NotFoundException("El usuario no existe"));
        var reference = safeReference(input.reference());
        var account = accounts.findByIdAndUserId(input.accountId(), user).orElseThrow(() -> new NotFoundException("La cuenta no existe"));
        if (!account.isActive() || !List.of(AccountType.BANK, AccountType.SAVINGS, AccountType.DIGITAL_WALLET).contains(account.getType()))
            throw new BadRequestException("Elige una cuenta bancaria o billetera activa");
        var row = cards.findByUserIdAndReference(user, reference).orElseGet(WalletCard::new);
        row.setUserId(user); row.setReference(reference); row.setName(input.name().trim());
        row.setKind(input.kind().name()); row.setAccountId(input.accountId());
        return response(cards.saveAndFlush(row));
    }
    @Transactional
    public void delete(Long user, Long id) {
        users.lockForAlertUpdate(user).orElseThrow(() -> new NotFoundException("El usuario no existe"));
        cards.delete(cards.findByIdAndUserId(id, user).orElseThrow(() -> new NotFoundException("La tarjeta no existe")));
    }
    static String safeReference(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (trimmed.length() > 80 || trimmed.chars().anyMatch(Character::isISOControl)
                || trimmed.replaceAll("[ -]", "").matches(".*[0-9]{13,19}.*"))
            throw new BadRequestException("Usa un alias o los últimos cuatro dígitos, nunca el número completo de tarjeta");
        return trimmed;
    }
    private Card response(WalletCard row) { return new Card(row.getId(), row.getReference(), row.getName(), Kind.valueOf(row.getKind()), row.getAccountId()); }
}
