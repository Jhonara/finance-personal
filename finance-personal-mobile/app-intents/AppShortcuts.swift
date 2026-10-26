import AppIntents

struct FinanceAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: RegisterExpenseIntent(), phrases: ["Registrar un gasto en \(.applicationName)"],
                shortTitle: "Registrar gasto", systemImageName: "minus.circle")
    AppShortcut(intent: ImportWalletPurchaseIntent(), phrases: ["Importar una compra en \(.applicationName)"],
                shortTitle: "Importar compra", systemImageName: "creditcard")
    AppShortcut(intent: RegisterIncomeIntent(), phrases: ["Registrar un ingreso en \(.applicationName)"],
                shortTitle: "Registrar ingreso", systemImageName: "plus.circle")
    AppShortcut(intent: RegisterTransferIntent(), phrases: ["Registrar una transferencia en \(.applicationName)"],
                shortTitle: "Transferencia", systemImageName: "arrow.left.arrow.right")
    AppShortcut(intent: CheckBalanceIntent(), phrases: ["Consultar mi saldo en \(.applicationName)"],
                shortTitle: "Consultar saldo", systemImageName: "wallet.pass")
  }
}
