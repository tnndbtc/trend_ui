#!/bin/bash

# Trend UI Setup Script
# Interactive setup and management for Next.js UI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PORT=3000
APP_NAME="Trend UI"

# Helper functions
print_header() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════╗"
    echo "║        Trend UI Setup Script          ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Get local IP address
get_local_ip() {
    # Try multiple methods to get local IP
    local ip=""

    # Method 1: Using hostname -I (Linux)
    if command -v hostname &> /dev/null; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    # Method 2: Using ip route (Linux)
    if [ -z "$ip" ] && command -v ip &> /dev/null; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+')
    fi

    # Method 3: Using ifconfig (macOS/Linux)
    if [ -z "$ip" ] && command -v ifconfig &> /dev/null; then
        ip=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)
    fi

    # Fallback
    if [ -z "$ip" ]; then
        ip="localhost"
    fi

    echo "$ip"
}

# Show access URLs
show_access_urls() {
    print_header
    echo -e "${BOLD}Access URLs:${NC}\n"

    local_ip=$(get_local_ip)

    echo -e "${GREEN}${BOLD}Local Access:${NC}"
    echo -e "  ${CYAN}http://localhost:${APP_PORT}${NC}"
    echo -e "  ${CYAN}http://127.0.0.1:${APP_PORT}${NC}"
    echo ""

    echo -e "${MAGENTA}${BOLD}Network Access:${NC}"
    echo -e "  ${CYAN}http://${local_ip}:${APP_PORT}${NC}"
    echo ""

    echo -e "${BLUE}${BOLD}Mobile/Other Devices:${NC}"
    echo -e "  Use: ${CYAN}http://${local_ip}:${APP_PORT}${NC}"
    echo -e "  (Ensure devices are on the same network)"
    echo ""

    # Check if service is running
    if curl -s "http://localhost:${APP_PORT}" > /dev/null 2>&1; then
        print_success "Service is running and accessible!"
    elif docker ps | grep -q "trend-ui"; then
        print_warning "Docker container is running but service may be starting..."
        print_info "Wait a few seconds and try accessing the URLs above"
    else
        print_warning "Service doesn't appear to be running"
        print_info "Use Option 1 to setup and start the service"
    fi

    echo -e "${YELLOW}  0)${NC} Go back"
    echo ""

    while true; do
        read -p "Enter 0 to go back: " url_choice
        if [ "$url_choice" = "0" ]; then
            return 0
        fi
        print_warning "Invalid option. Press 0 to go back."
    done
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BOLD}Checking prerequisites...${NC}\n"

    local missing=0

    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_success "Node.js installed: $node_version"
    else
        print_error "Node.js is not installed"
        missing=1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_success "npm installed: $npm_version"
    else
        print_error "npm is not installed"
        missing=1
    fi

    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker installed (optional)"
    else
        print_info "Docker not found (optional, needed for docker-compose option)"
    fi

    echo ""

    if [ $missing -eq 1 ]; then
        print_error "Missing required dependencies. Please install them first."
        echo ""
        echo "Install Node.js and npm:"
        echo "  Ubuntu/Debian: sudo apt install nodejs npm"
        echo "  macOS: brew install node"
        echo "  Or visit: https://nodejs.org/"
        echo ""
        return 1
    fi

    return 0
}

# Setup environment file
setup_env_file() {
    echo -e "${BOLD}Setting up environment file...${NC}\n"

    if [ -f ".env.local" ]; then
        print_success "Found existing .env.local - using current configuration"
        echo ""
        cat .env.local
        echo ""
        print_info "To update API URL, manually edit .env.local"
        return 0
    fi

    local_ip=$(get_local_ip)

    echo ""
    print_info "Please provide the Crawler API URL"
    echo -e "${YELLOW}Example: http://192.168.1.100:8002/api/v1${NC}"
    echo ""

    read -p "Enter Crawler API Base URL (or press Enter for default): " api_url

    if [ -z "$api_url" ]; then
        api_url="http://${local_ip}:8002/api/v1"
        print_info "Using default: $api_url"
    fi

    # Create .env.local
    cat > .env.local << EOF
# Local development environment
# This file is gitignored - safe for local API URLs

# Crawler API Base URL
NEXT_PUBLIC_CRAWLER_API_BASE_URL=${api_url}
EOF

    print_success "Created .env.local"
    echo ""
}

# Install dependencies
install_dependencies() {
    echo -e "${BOLD}Installing dependencies...${NC}\n"

    if [ -d "node_modules" ] && [ -f "node_modules/.bin/next" ]; then
        print_success "Dependencies already installed - skipping"
        print_info "To reinstall, run: npm install"
        echo ""
        return 0
    fi

    print_info "Running npm install..."
    npm install
    print_success "Dependencies installed successfully"
    echo ""
}

# Setup and run
setup_environment() {
    print_header
    echo -e "${BOLD}Environment Setup${NC}\n"

    # Check prerequisites
    if ! check_prerequisites; then
        return 1
    fi

    # Setup environment file
    setup_env_file

    # Install dependencies
    install_dependencies

    print_success "Environment setup complete!"
    echo ""

    # Kill any existing services before starting
    if pgrep -f "next dev|next start|next-server" > /dev/null || lsof -ti :${APP_PORT} > /dev/null 2>&1; then
        print_warning "Stopping existing services first..."
        pkill -9 -f "next dev" 2>/dev/null || true
        pkill -9 -f "next start" 2>/dev/null || true
        pkill -9 -f "next-server" 2>/dev/null || true
        lsof -ti :${APP_PORT} | xargs kill -9 2>/dev/null || true
        sleep 1
        print_success "Existing services stopped"
    fi

    # Stop any running docker container
    if command -v docker &> /dev/null && docker ps | grep -q "trend-ui"; then
        print_info "Stopping Docker container..."
        docker-compose down 2>/dev/null || docker stop trend-ui 2>/dev/null || true
        sleep 1
    fi

    echo ""
    print_info "Starting development server in background..."
    mkdir -p "${SCRIPT_DIR}/logs"
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] === Starting trend_ui dev server ===" >> "${SCRIPT_DIR}/logs/dev.log"
    nohup npm run dev >> "${SCRIPT_DIR}/logs/dev.log" 2>&1 &
    disown
    sleep 3

    # Check if started successfully
    if pgrep -f "next dev" > /dev/null; then
        print_success "Development server started!"
        echo -e "${CYAN}  → http://localhost:${APP_PORT}${NC}"
        echo -e "${CYAN}  → Logs: ${SCRIPT_DIR}/logs/dev.log${NC}"
        echo ""
        print_info "Use Option 3 (Check status) or Option 5 (Stop services) from main menu"
    else
        print_error "Failed to start development server"
        echo "Check logs: tail -f ${SCRIPT_DIR}/logs/dev.log"
    fi
}

# View logs
view_logs() {
    print_header
    echo -e "${BOLD}View Logs:${NC}\n"

    # Check what's running
    local has_dev=false
    local has_prod=false
    local has_docker=false

    if pgrep -f "next dev" > /dev/null; then
        has_dev=true
    fi

    if pgrep -f "next start" > /dev/null; then
        has_prod=true
    fi

    if docker ps | grep -q "trend-ui"; then
        has_docker=true
    fi

    # Show available logs
    echo -e "${BOLD}Available logs:${NC}\n"

    if [ "$has_dev" = true ]; then
        echo -e "  ${GREEN}1)${NC} Development server logs"
    fi

    if [ "$has_prod" = true ]; then
        echo -e "  ${GREEN}2)${NC} Production server logs"
    fi

    if [ "$has_docker" = true ]; then
        echo -e "  ${GREEN}3)${NC} Docker container logs"
    fi

    if [ "$has_dev" = false ] && [ "$has_prod" = false ] && [ "$has_docker" = false ]; then
        print_info "No services are currently running"
        echo ""
        echo -e "  ${YELLOW}0)${NC} Go back"
        echo ""
        while true; do
            read -p "Enter 0 to go back: " log_back
            if [ "$log_back" = "0" ]; then
                return 0
            fi
            print_warning "Invalid option. Press 0 to go back."
        done
    fi

    echo -e "  ${YELLOW}0)${NC} Go back"
    echo ""

    read -p "Select option: " log_option

    case $log_option in
        1)
            if [ "$has_dev" = true ]; then
                echo ""
                print_info "Showing development logs (Press Ctrl+C to exit)..."
                echo ""
                sleep 1
                tail -f "${SCRIPT_DIR}/logs/dev.log"
            else
                print_warning "Development server is not running"
            fi
            ;;
        2)
            if [ "$has_prod" = true ]; then
                echo ""
                print_info "Showing production logs (Press Ctrl+C to exit)..."
                echo ""
                sleep 1
                tail -f "${SCRIPT_DIR}/logs/prod.log"
            else
                print_warning "Production server is not running"
            fi
            ;;
        3)
            if [ "$has_docker" = true ]; then
                echo ""
                print_info "Showing docker logs (Press Ctrl+C to exit)..."
                echo ""
                sleep 1
                docker-compose logs -f
            else
                print_warning "Docker container is not running"
            fi
            ;;
        0)
            return 0
            ;;
        *)
            print_warning "Invalid option"
            ;;
    esac

    echo ""
}

# Main menu
show_menu() {
    print_header

    echo -e "${BOLD}Please select an option:${NC}\n"
    echo -e "  ${GREEN}1)${NC} Setup and start service"
    echo -e "  ${YELLOW}2)${NC} Stop all services"
    echo -e "  ${CYAN}3)${NC} Check service status"
    echo -e "  ${MAGENTA}4)${NC} Show access URLs"
    echo -e "  ${RED}0)${NC} Exit"
    echo ""
}

# Check service status
check_status() {
    print_header
    echo -e "${BOLD}Service Status:${NC}\n"

    # Check npm process
    if pgrep -f "next dev|next start|next-server" > /dev/null; then
        print_success "Next.js process is running"
        echo ""
        ps aux | grep -E "next dev|next start|next-server" | grep -v grep
    else
        print_info "No Next.js process found"
    fi

    echo ""

    # Check Docker
    if command -v docker &> /dev/null; then
        if docker ps | grep -q "trend-ui"; then
            print_success "Docker container is running"
            echo ""
            docker ps | grep "trend-ui"
        else
            print_info "No Docker container running"
        fi
    fi

    echo ""

    # Check port
    if lsof -i :${APP_PORT} > /dev/null 2>&1; then
        print_success "Port ${APP_PORT} is in use (service likely running)"
        echo ""
        lsof -i :${APP_PORT}
    else
        print_warning "Port ${APP_PORT} is not in use"
    fi

    echo ""
}

# Stop all services
stop_services() {
    print_header
    echo -e "${BOLD}Stopping services...${NC}\n"

    local stopped=0

    # Stop Next.js development server (kill entire process tree)
    if pgrep -f "next dev" > /dev/null; then
        echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] === Stopping trend_ui dev server ===" >> "${SCRIPT_DIR}/logs/dev.log" 2>/dev/null
        print_info "Stopping Next.js development server..."
        # Kill all processes matching "next dev"
        pkill -9 -f "next dev" 2>/dev/null || true
        # Also kill next-server processes
        pkill -9 -f "next-server" 2>/dev/null || true
        # Kill any remaining node processes from this directory
        pkill -9 -f "node.*trend_ui" 2>/dev/null || true
        stopped=1
        sleep 1
    fi

    # Stop Next.js production server (kill entire process tree)
    if pgrep -f "next start" > /dev/null; then
        echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] === Stopping trend_ui prod server ===" >> "${SCRIPT_DIR}/logs/prod.log" 2>/dev/null
        print_info "Stopping Next.js production server..."
        # Kill all processes matching "next start"
        pkill -9 -f "next start" 2>/dev/null || true
        # Also kill next-server processes
        pkill -9 -f "next-server" 2>/dev/null || true
        # Kill any remaining node processes from this directory
        pkill -9 -f "node.*trend_ui" 2>/dev/null || true
        stopped=1
        sleep 1
    fi

    # Stop Docker
    if command -v docker &> /dev/null; then
        if docker ps | grep -q "trend-ui"; then
            print_info "Stopping Docker container..."
            docker-compose down 2>/dev/null || docker stop trend-ui 2>/dev/null || true
            stopped=1
        fi
    fi

    # Kill any process using port 3000 (belt and suspenders)
    if lsof -ti :${APP_PORT} > /dev/null 2>&1; then
        print_info "Killing processes on port ${APP_PORT}..."
        lsof -ti :${APP_PORT} | xargs kill -9 2>/dev/null || true
        stopped=1
        sleep 1
    fi

    # Verify all stopped
    if pgrep -f "next dev|next start|next-server" > /dev/null; then
        print_warning "Some processes may still be running, force killing all Next.js processes..."
        pkill -9 -f "next" 2>/dev/null || true
        sleep 1
    fi

    # Final verification
    if pgrep -f "next" > /dev/null || lsof -ti :${APP_PORT} > /dev/null 2>&1; then
        print_warning "Still some processes remain, force killing all node processes..."
        killall -9 node 2>/dev/null || true
        sleep 1
    fi

    if [ $stopped -eq 1 ]; then
        print_success "All services stopped"
    else
        print_info "No services were running"
    fi

    echo ""
}

# Main loop
main() {
    while true; do
        show_menu
        read -p "Enter your choice [0-4]: " choice

        case $choice in
            1)
                setup_environment
                sleep 1
                ;;
            2)
                stop_services
                ;;
            3)
                check_status
                ;;
            4)
                show_access_urls
                ;;
            0)
                echo ""
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                sleep 2
                ;;
        esac
    done
}

# Run main function
main
