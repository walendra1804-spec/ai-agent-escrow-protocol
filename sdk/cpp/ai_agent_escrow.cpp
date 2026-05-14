#include <chrono>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <random>
#include <sstream>
#include <stdexcept>
#include <string>

static std::string env_required(const char* name) {
    const char* value = std::getenv(name);
    if (value == nullptr || std::string(value).empty()) {
        throw std::runtime_error(std::string("Missing environment variable: ") + name);
    }
    return std::string(value);
}

static std::string env_default(const char* name, const std::string& fallback) {
    const char* value = std::getenv(name);
    if (value == nullptr || std::string(value).empty()) {
        return fallback;
    }
    return std::string(value);
}

static std::string random_hex_bytes(std::size_t bytes) {
    std::random_device rd;
    std::uniform_int_distribution<int> dist(0, 255);
    std::ostringstream out;
    out << "0x";
    for (std::size_t i = 0; i < bytes; ++i) {
        out << std::hex << std::setw(2) << std::setfill('0') << dist(rd);
    }
    return out.str();
}

static std::string make_order_id() {
    const auto now = std::chrono::system_clock::now().time_since_epoch();
    const auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(now).count();
    return "ord_" + std::to_string(millis) + "_" + random_hex_bytes(8).substr(2);
}

static std::string q(const std::string& value) {
#ifdef _WIN32
    return "\"" + value + "\"";
#else
    return "'" + value + "'";
#endif
}

static std::string run_command(const std::string& command) {
    const int exit_code = std::system(command.c_str());
    if (exit_code != 0) {
        throw std::runtime_error("Command failed:\n" + command);
    }
    return "Transaction command finished.";
}

int main() {
    try {
        const std::string rpc_url = env_default("AI_ESCROW_RPC_URL", "https://sepolia.base.org");
        const std::string contract = env_required("AI_ESCROW_CONTRACT_ADDRESS");
        const std::string private_key = env_required("AI_BUYER_PRIVATE_KEY");
        const std::string seller = env_required("AI_SELLER_ADDRESS");
        const std::string amount_wei = env_default("AI_ESCROW_AMOUNT_WEI", "10000000000000000");
        const std::string duration = env_default("AI_ESCROW_DURATION_SECONDS", "3600");

        const std::string order_id = make_order_id();
        const std::string agreement_hash = random_hex_bytes(32);

        std::cout << "Payload sent by AI agent:\n";
        std::cout << "{\n";
        std::cout << "  \"orderId\": \"" << order_id << "\",\n";
        std::cout << "  \"seller\": \"" << seller << "\",\n";
        std::cout << "  \"amountWei\": \"" << amount_wei << "\",\n";
        std::cout << "  \"durationSeconds\": " << duration << ",\n";
        std::cout << "  \"agreementHash\": \"" << agreement_hash << "\"\n";
        std::cout << "}\n\n";

        const std::string command =
            "cast send " + contract + " " +
            q("createEscrow(address,uint64,bytes32)") + " " +
            seller + " " +
            duration + " " +
            agreement_hash + " " +
            "--value " + amount_wei + " " +
            "--rpc-url " + rpc_url + " " +
            "--private-key " + private_key + " " +
            "--json";

        std::cout << "Sending transaction with Foundry cast...\n";
        std::cout << run_command(command) << "\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << "\n";
        return 1;
    }
}
