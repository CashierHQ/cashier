
import "./just/build.just"
import "./just/code_check.just"
import "./just/test.just"

export RUST_BACKTRACE := "full"
ARTIFACTS_DIR := env("ARTIFACTS_DIR", "./target/artifacts")


# Lists all the available commands
default:
  @just --list



