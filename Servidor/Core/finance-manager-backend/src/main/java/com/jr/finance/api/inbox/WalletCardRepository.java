package com.jr.finance.api.inbox;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface WalletCardRepository extends JpaRepository<WalletCard, Long> {
    List<WalletCard> findByUserIdOrderById(Long userId);
    Optional<WalletCard> findByUserIdAndReference(Long userId, String reference);
    Optional<WalletCard> findByIdAndUserId(Long id, Long userId);
}
