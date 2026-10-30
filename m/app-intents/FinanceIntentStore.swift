import Foundation
import Security
internal import ExpoAppIntents

struct FinanceInvocation: Codable, Sendable {
  let id: String
  let ownerId: String
  let name: String
  let params: [String: String]
}

private struct FinancePendingState: Codable {
  var ownerId: String?
  var pending: [FinanceInvocation] = []
}

enum FinanceIntentError: LocalizedError {
  case signedOut, full, storage, wrongOwner, invalidInput
  var errorDescription: String? {
    switch self {
    case .signedOut: "Abre Finance Personal e inicia sesión antes de ejecutar la acción."
    case .full: "Tienes 100 acciones pendientes. Abre Finance Personal para procesarlas antes de añadir otra."
    case .storage: "No se pudo guardar la acción de forma segura. Desbloquea el iPhone e inténtalo de nuevo."
    case .wrongOwner: "Esta acción pertenece a otro usuario."
    case .invalidInput: "Revisa los datos. Usa un importe positivo y un alias de tarjeta, nunca su número completo."
    }
  }
}

/// App-target actor: atomic Keychain writes; no eviction, JWT, bank credentials, or cloud sync.
actor FinanceIntentStore {
  static let shared = FinanceIntentStore()
  private let service = "finance-personal.native-intents.v1"

  private func query() -> [String: Any] {
    [kSecClass as String: kSecClassGenericPassword,
     kSecAttrService as String: service, kSecAttrAccount as String: "pending",
     kSecAttrSynchronizable as String: false]
  }

  private func read() throws -> FinancePendingState {
    var request = query()
    request[kSecReturnData as String] = true
    request[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &result)
    if status == errSecItemNotFound { return FinancePendingState() }
    guard status == errSecSuccess, let data = result as? Data else { throw FinanceIntentError.storage }
    // A corrupt record is never reset or silently discarded.
    return try JSONDecoder().decode(FinancePendingState.self, from: data)
  }

  private func write(_ state: FinancePendingState) throws {
    let data = try JSONEncoder().encode(state)
    let updates: [String: Any] = [kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
    var status = SecItemUpdate(query() as CFDictionary, updates as CFDictionary)
    if status == errSecItemNotFound {
      var request = query()
      updates.forEach { request[$0.key] = $0.value }
      status = SecItemAdd(request as CFDictionary, nil)
    }
    guard status == errSecSuccess else { throw FinanceIntentError.storage }
  }

  func setOwner(_ owner: String?) throws {
    var state = try read()
    state.ownerId = owner
    try write(state) // Switching users preserves, but isolates, every pending invocation.
  }

  func enqueue(name: String, params: [String: String] = [:]) async throws {
    var state = try read()
    guard let owner = state.ownerId else { throw FinanceIntentError.signedOut }
    guard state.pending.count < 100 else { throw FinanceIntentError.full }
    state.pending.append(FinanceInvocation(id: UUID().uuidString, ownerId: owner, name: name, params: params))
    try write(state)
    // Only a content-free wake-up enters Expo's bounded UserDefaults queue. Financial data stays in Keychain.
    await AppIntentDispatcher.shared.dispatch(name: "financePending")
  }

  func pending(owner: String) throws -> String {
    let state = try read()
    guard state.ownerId == owner else { throw FinanceIntentError.wrongOwner }
    return String(decoding: try JSONEncoder().encode(state.pending.filter { $0.ownerId == owner }), as: UTF8.self)
  }

  func complete(owner: String, id: String) throws {
    var state = try read()
    guard state.ownerId == owner else { throw FinanceIntentError.wrongOwner }
    state.pending.removeAll { $0.id == id && $0.ownerId == owner }
    try write(state)
  }
}

enum FinanceIntentParameters {
  static func purchase(amount: Double?, merchant: String?, currency: String?, date: Date?,
                       card: String? = nil, event: String? = nil) throws -> [String: String] {
    var params: [String: String] = [:]
    if let amount {
      guard amount.isFinite, amount > 0, amount < 1_000_000_000_000 else { throw FinanceIntentError.invalidInput }
      let text = NSDecimalNumber(value: amount).stringValue
      guard text.range(of: "^[0-9]{1,12}(\\.[0-9]{1,4})?$", options: .regularExpression) != nil else { throw FinanceIntentError.invalidInput }
      params["amount"] = text
    }
    for (key, value, max) in [("merchant", merchant, 120), ("currency", currency, 3),
                               ("cardReference", card, 80), ("eventReference", event, 120)] {
      if let value {
        let clean = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count <= max, !clean.unicodeScalars.contains(where: CharacterSet.controlCharacters.contains)
          else { throw FinanceIntentError.invalidInput }
        if !clean.isEmpty { params[key] = clean }
      }
    }
    if let currency = params["currency"] {
      let code = currency.uppercased()
      guard code.range(of: "^[A-Z]{3}$", options: .regularExpression) != nil else { throw FinanceIntentError.invalidInput }
      params["currency"] = code
    }
    if let card = params["cardReference"] {
      let compact = card.replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "-", with: "")
      guard compact.range(of: "[0-9]{13,19}", options: .regularExpression) == nil else { throw FinanceIntentError.invalidInput }
    }
    if let date {
      let formatter = ISO8601DateFormatter()
      formatter.timeZone = TimeZone.current
      params["occurredAt"] = formatter.string(from: date)
    }
    return params
  }
}
