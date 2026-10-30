import AppIntents

struct RegisterExpenseIntent: AppIntent {
  static let title: LocalizedStringResource = "Registrar gasto"
  static let description = IntentDescription("Prepara un gasto y abre Finance Personal para revisar la cuenta, la categoría y confirmarlo.")
  static let openAppWhenRun = true
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Importe") var amount: Double
  @Parameter(title: "Comercio o concepto") var merchant: String
  @Parameter(title: "Moneda (COP, USD…)") var currency: String
  @Parameter(title: "Fecha de la compra") var date: Date?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let params = try FinanceIntentParameters.purchase(amount: amount, merchant: merchant, currency: currency, date: date)
    guard params["merchant"] != nil, params["currency"] != nil else { throw FinanceIntentError.invalidInput }
    try await FinanceIntentStore.shared.enqueue(name: "registerExpense", params: params)
    return .result(dialog: "Abriendo Finance Personal para revisar y confirmar el gasto.")
  }
}
