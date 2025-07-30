
import "./just/build.just"
import "./just/code_check.just"
import "./just/test.just"

export RUST_BACKTRACE := "full"
ARTIFACT_DIR := env("ARTIFACT_DIR", "./target/artifact")


# Lists all the available commands
default:
  @just --list



