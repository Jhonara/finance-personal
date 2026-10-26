package com.jr.finance.api.inbox;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** A routing preference, never a bank card credential or a revolving-credit ledger account. */
@Entity @Getter @Setter
@Table(name = "wallet_card_links", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "reference"}))
public class WalletCard {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 80) private String reference;
    @Column(nullable = false, length = 80) private String name;
    @Column(nullable = false, length = 16) private String kind;
    @Column(nullable = false) private Long accountId;
}
