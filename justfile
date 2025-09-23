
import "./just/build.just"
import "./just/code_check.just"
import "./just/dfx.just"
import "./just/run.just"
import "./just/test.just"

export RUST_BACKTRACE := "full"
FRONTEND_DIR := "./src/cashier_frontend"
FRONTEND_DIR_NEW := "./src/cashier_frontend_new"
ARTIFACTS_DIR := env("ARTIFACTS_DIR", "./target/artifacts")

# Lists all the available commands
default:
  @just --list
