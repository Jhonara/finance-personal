import AppIntents

struct ImportWalletPurchaseIntent: AppIntent {
  static let title: LocalizedStringResource = "Importar compra de Wallet"
  static let description = IntentDescription("Recibe los datos compartidos por una automatización. Crea un borrador por revisar; no confirma un cargo ni lee el historial de Wallet.")
  static let openAppWhenRun = true
  static let authenticationPolicy: IntentAuthenticationPolicy = .requiresLocalDeviceAuthentication

  @Parameter(title: "Importe recibido") var amount: Double?
  @Parameter(title: "Comercio recibido") var merchant: String?
  @Parameter(title: "Moneda recibida (COP, USD…)") var currency: String?
  @Parameter(title: "Fecha y hora recibidas") var date: Date?
  @Parameter(title: "Referencia o alias de tarjeta (sin número completo)") var cardReference: String?
  @Parameter(title: "Identificador de compra, si existe") var eventReference: String?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let params = try FinanceIntentParameters.purchase(amount: amount, merchant: merchant, currency: currency,
      date: date, card: cardReference, event: eventReference)
    try await FinanceIntentStore.shared.enqueue(name: "importWallet", params: params)
    return .result(dialog: "Compra recibida en este iPhone. Abriendo Finance Personal para guardarla por revisar.")
  }
}
