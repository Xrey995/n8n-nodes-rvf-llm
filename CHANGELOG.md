# Changelog

## [1.1.0] - 2025-12-05

### Added
- ✅ Full tool calling support with LangChain integration
- ✅ Proper handling of system messages in chat chains
- ✅ Tool execution with AI Agent compatibility
- ✅ Support for tool_calls parsing from API responses

### Fixed
- 🔧 Fixed tools not being passed to RVF LLM API
- 🔧 Corrected tool_call_id handling in ToolMessage
- 🔧 Improved error handling for API responses

### Changed
- ⚙️ Refactored RvfLLMChatLangChain class for better OpenAI compatibility
- ⚙️ Updated message role mapping (human → user, ai → assistant)
