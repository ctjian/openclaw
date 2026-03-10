import OpenClawKit
import Foundation
import Testing

@Suite struct ToolDisplayRegistryTests {
    @Test func loadsToolDisplayConfigFromBundle() {
        let url = OpenClawKitResources.bundle.url(forResource: "tool-display", withExtension: "json")
        #expect(url != nil)
    }

    @Test func resolvesKnownToolFromConfig() {
        let summary = ToolDisplayRegistry.resolve(name: "bash", args: nil)
        #expect(summary.emoji == "🛠️")
        #expect(summary.title == "Bash")
    }

    @Test func resolvesProcessTitleFromAction() {
        let summary = ToolDisplayRegistry.resolve(
            name: "process",
            args: AnyCodable([
                "action": AnyCodable("poll"),
                "sessionId": AnyCodable("s-1"),
            ]))
        #expect(summary.title == "Process Poll")
        #expect(summary.label == "Process Poll")
    }

    @Test func resolvesProcessWriteTitleFromNestedDataAction() {
        let summary = ToolDisplayRegistry.resolve(
            name: "process",
            args: AnyCodable([
                "action": AnyCodable("write"),
                "data": AnyCodable("{\"action\":\"navigate\",\"targetUrl\":\"https://example.com\"}"),
                "sessionId": AnyCodable("s-2"),
            ]))
        #expect(summary.title == "Process Navigate")
        #expect(summary.label == "Process Navigate")
    }

    @Test func fallsBackToOuterProcessActionWhenNestedDataIsInvalidJSON() {
        let summary = ToolDisplayRegistry.resolve(
            name: "process",
            args: AnyCodable([
                "action": AnyCodable("write"),
                "data": AnyCodable("{not-json"),
                "sessionId": AnyCodable("s-3"),
            ]))
        #expect(summary.title == "Process Write")
        #expect(summary.label == "Process Write")
    }
}
