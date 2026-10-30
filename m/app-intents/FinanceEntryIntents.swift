import AppIntents

// These actions deliberately reuse the existing, interactive financial flows.
// They never claim a transaction was posted or return a cached balance to Siri.
struct RegisterIncomeIntent: AppIntent {
  static let title: LocalizedStringResource = "Registrar ingreso"
  static let description = IntentDescription("Abre el registro de ingresos para elegir cuenta, importe y confirmar en Finance Personal.")
  static let openAppWhenRun = true
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication
  @MainActor func perform() async throws -> some IntentResult & ProvidesDialog {
    try await FinanceIntentStore.shared.enqueue(name: "openIncome")
    return .result(dialog: "Abriendo el registro de ingresos. Completa y confirma el ingreso en Finance Personal.")
  }
}

struct RegisterTransferIntent: AppIntent {
  static let title: LocalizedStringResource = "Registrar transferencia"
  static let description = IntentDescription("Abre una transferencia entre tus cuentas para completar y confirmar en Finance Personal.")
  static let openAppWhenRun = true
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication
  @MainActor func perform() async throws -> some IntentResult & ProvidesDialog {
    try await FinanceIntentStore.shared.enqueue(name: "openTransfer")
    return .result(dialog: "Abriendo transferencias. Elige las cuentas y confirma en Finance Personal.")
  }
}

struct CheckBalanceIntent: AppIntent {
  static let title: LocalizedStringResource = "Consultar saldo"
  static let description = IntentDescription("Abre tus cuentas para consultar los saldos del servidor, separados por moneda y respetando tu privacidad.")
  static let openAppWhenRun = true
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication
  @MainActor func perform() async throws -> some IntentResult & ProvidesDialog {
    try await FinanceIntentStore.shared.enqueue(name: "openBalances")
    return .result(dialog: "Abriendo tus cuentas para consultar el saldo en Finance Personal.")
  }
}
