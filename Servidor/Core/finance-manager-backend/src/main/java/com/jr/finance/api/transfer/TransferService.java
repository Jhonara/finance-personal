package com.jr.finance.api.transfer;
import com.jr.finance.api.account.*; import com.jr.finance.api.common.exception.*; import com.jr.finance.api.ledger.*; import com.jr.finance.api.transfer.dto.*; import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import java.math.*; import java.util.*;
@Service @RequiredArgsConstructor public class TransferService {
 private final AccountRepository accounts; private final LedgerEntryRepository entries; private final FinancialTransactionRepository transactions; private final UserRepository users;
 @Transactional public TransferResponse create(Long userId, CreateTransferRequest r) {
  if(r.getSourceAccountId().equals(r.getDestinationAccountId())) throw new BadRequestException("Las cuentas deben ser distintas");
  var locked=accounts.lockByIds(List.of(Math.min(r.getSourceAccountId(),r.getDestinationAccountId()),Math.max(r.getSourceAccountId(),r.getDestinationAccountId())));
  if(locked.size()!=2) throw new NotFoundException("La cuenta no existe"); Account source=locked.stream().filter(a->a.getId().equals(r.getSourceAccountId())).findFirst().orElseThrow(); Account destination=locked.stream().filter(a->a.getId().equals(r.getDestinationAccountId())).findFirst().orElseThrow();
  if(!source.getUser().getId().equals(userId)||!destination.getUser().getId().equals(userId)) throw new NotFoundException("La cuenta no existe");
  if(!source.isActive()||!destination.isActive()) throw new BadRequestException("La cuenta está inactiva"); if(!source.getCurrency().equals(destination.getCurrency())) throw new BadRequestException("Las cuentas deben usar la misma moneda");
  BigDecimal balance=entries.sumPostedByAccountId(source.getId(), FinancialTransactionStatus.VOIDED); if(balance.compareTo(r.getAmount())<0) throw new BadRequestException("Saldo insuficiente");
  var tx=new FinancialTransaction(); tx.setUser(users.findById(userId).orElseThrow(()->new NotFoundException("El usuario no existe"))); tx.setType(FinancialTransactionType.TRANSFER); tx.setStatus(FinancialTransactionStatus.POSTED); tx.setEffectiveDate(r.getEffectiveDate()); tx.setDescription(r.getDescription()==null||r.getDescription().trim().isEmpty()?null:r.getDescription().trim()); tx.setCurrency(source.getCurrency()); tx=transactions.saveAndFlush(tx);
  for(var pair:List.of(new Object[]{source,r.getAmount().negate()},new Object[]{destination,r.getAmount()})){var e=new LedgerEntry(); e.setFinancialTransaction(tx);e.setAccount((Account)pair[0]);e.setSignedAmount((BigDecimal)pair[1]);entries.save(e);} entries.flush();
  return new TransferResponse(tx.getId(),source.getId(),destination.getId(),source.getName(),destination.getName(),r.getAmount(),tx.getCurrency(),tx.getEffectiveDate(),tx.getDescription(),tx.getStatus().name());
 }
}
