
import "./just/build.just"
import "./just/code_check.just"
import "./just/dfx.just"
import "./just/run.just"
import "./just/test.just"
import "./just/orbit.just"

export RUST_BACKTRACE := "full"
FRONTEND_DIR_NEW := "./src/cashier_frontend_new"
ARTIFACTS_DIR := env("ARTIFACTS_DIR", "./target/artifacts")

# Detect OS for cross-platform commands
OS := if os() == "macos" { "macos" } else if os() == "linux" { "linux" } else { "windows" }

# Lists all the available commands
default:
  @just --list
