internal import ExpoAppIntents
internal import ExpoModulesCore

/// Registered Expo inline module that wires app-target App Intents code to expo-app-intents.
/// Do not change the name of this class.
final class AppIntentsSetup: Module {
  public func definition() -> ExpoModulesCore.ModuleDefinition {
    Name("AppIntentsSetup")
    OnCreate {
      Task {
        await AppIntentDispatcher.shared.setShortcutsRefreshHandler {
          FinanceAppShortcuts.updateAppShortcutParameters()
        }
        FinanceAppShortcuts.updateAppShortcutParameters()
      }
    }
    AsyncFunction("setOwnerAsync") { (owner: String?) async throws in
      try await FinanceIntentStore.shared.setOwner(owner)
    }
    AsyncFunction("pendingAsync") { (owner: String) async throws -> String in
      try await FinanceIntentStore.shared.pending(owner: owner)
    }
    AsyncFunction("completeAsync") { (owner: String, id: String) async throws in
      try await FinanceIntentStore.shared.complete(owner: owner, id: id)
    }
  }
}
