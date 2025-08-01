import SwiftUI

struct ContentView: View {
    @State private var isAnimating = false
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            LandingView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)
            
            DashboardView()
                .tabItem {
                    Image(systemName: "chart.bar.fill")
                    Text("Dashboard")
                }
                .tag(1)
            
            InventoryView()
                .tabItem {
                    Image(systemName: "cube.box.fill")
                    Text("Inventory")
                }
                .tag(2)
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gear")
                    Text("Settings")
                }
                .tag(3)
        }
        .accentColor(.blue)
        .onAppear {
            isAnimating = true
        }
    }
}

struct LandingView: View {
    @State private var isAnimating = false
    @State private var showFeatures = false
    @State private var showStats = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero Section
                    HeroSection(isAnimating: $isAnimating)
                    
                    // Features Section
                    FeaturesSection(showFeatures: $showFeatures)
                    
                    // Stats Section
                    StatsSection(showStats: $showStats)
                    
                    // Demo Section
                    DemoSection()
                    
                    // CTA Section
                    CTASection()
                }
            }
            .navigationBarHidden(true)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.0)) {
                    isAnimating = true
                }
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    withAnimation(.easeInOut(duration: 0.8)) {
                        showFeatures = true
                    }
                }
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    withAnimation(.easeInOut(duration: 0.8)) {
                        showStats = true
                    }
                }
            }
        }
    }
}

struct HeroSection: View {
    @Binding var isAnimating: Bool
    @State private var gradientRotation: Double = 0
    
    var body: some View {
        ZStack {
            // Animated gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.blue.opacity(0.8),
                    Color.purple.opacity(0.8),
                    Color.blue.opacity(0.6)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .rotationEffect(.degrees(gradientRotation))
            .onAppear {
                withAnimation(.linear(duration: 10).repeatForever(autoreverses: false)) {
                    gradientRotation = 360
                }
            }
            
            // Floating shapes
            ForEach(0..<6) { index in
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: CGFloat.random(in: 20...60))
                    .offset(
                        x: CGFloat.random(in: -150...150),
                        y: CGFloat.random(in: -300...300)
                    )
                    .animation(
                        Animation.easeInOut(duration: Double.random(in: 3...6))
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.5),
                        value: isAnimating
                    )
            }
            
            VStack(spacing: 30) {
                Spacer()
                
                // Main title
                VStack(spacing: 20) {
                    Text("Smart Inventory")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .scaleEffect(isAnimating ? 1.0 : 0.8)
                        .opacity(isAnimating ? 1.0 : 0.0)
                        .animation(.easeOut(duration: 0.8), value: isAnimating)
                    
                    Text("Management System")
                        .font(.system(size: 24, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.9))
                        .scaleEffect(isAnimating ? 1.0 : 0.8)
                        .opacity(isAnimating ? 1.0 : 0.0)
                        .animation(.easeOut(duration: 0.8).delay(0.2), value: isAnimating)
                }
                
                // Subtitle
                Text("Streamline your business operations with intelligent inventory tracking. Real-time monitoring, automated alerts, and powerful analytics.")
                    .font(.system(size: 18, weight: .regular))
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .opacity(isAnimating ? 1.0 : 0.0)
                    .animation(.easeOut(duration: 0.8).delay(0.4), value: isAnimating)
                
                // Action buttons
                HStack(spacing: 20) {
                    Button(action: {
                        // Get Started action
                    }) {
                        HStack {
                            Image(systemName: "rocket.fill")
                            Text("Get Started")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.blue)
                        .padding(.horizontal, 30)
                        .padding(.vertical, 15)
                        .background(Color.white)
                        .cornerRadius(25)
                        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
                    }
                    .scaleEffect(isAnimating ? 1.0 : 0.8)
                    .opacity(isAnimating ? 1.0 : 0.0)
                    .animation(.easeOut(duration: 0.8).delay(0.6), value: isAnimating)
                    
                    Button(action: {
                        // Watch Demo action
                    }) {
                        HStack {
                            Image(systemName: "play.fill")
                            Text("Watch Demo")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 30)
                        .padding(.vertical, 15)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(25)
                        .overlay(
                            RoundedRectangle(cornerRadius: 25)
                                .stroke(Color.white, lineWidth: 1)
                        )
                    }
                    .scaleEffect(isAnimating ? 1.0 : 0.8)
                    .opacity(isAnimating ? 1.0 : 0.0)
                    .animation(.easeOut(duration: 0.8).delay(0.8), value: isAnimating)
                }
                
                Spacer()
            }
            .padding(.horizontal, 20)
        }
        .frame(height: UIScreen.main.bounds.height * 0.9)
    }
}

struct FeaturesSection: View {
    @Binding var showFeatures: Bool
    
    let features = [
        Feature(icon: "chart.bar.fill", title: "Real-time Analytics", description: "Get instant insights into your inventory levels and trends"),
        Feature(icon: "bell.fill", title: "Smart Alerts", description: "Never run out of stock with intelligent notifications"),
        Feature(icon: "iphone", title: "Mobile First", description: "Access your inventory data anywhere, anytime"),
        Feature(icon: "bolt.fill", title: "Lightning Fast", description: "Built for performance with thousands of items"),
        Feature(icon: "lock.shield.fill", title: "Enterprise Security", description: "Bank-level security with role-based access"),
        Feature(icon: "link", title: "Seamless Integration", description: "Connect with your existing systems via API")
    ]
    
    var body: some View {
        VStack(spacing: 40) {
            // Section header
            VStack(spacing: 15) {
                Text("Why Choose Our Platform?")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                
                Text("Powerful features designed to transform your inventory management")
                    .font(.system(size: 18, weight: .regular))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            .opacity(showFeatures ? 1.0 : 0.0)
            .offset(y: showFeatures ? 0 : 50)
            .animation(.easeOut(duration: 0.8), value: showFeatures)
            
            // Features grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 20) {
                ForEach(Array(features.enumerated()), id: \.offset) { index, feature in
                    FeatureCard(feature: feature)
                        .opacity(showFeatures ? 1.0 : 0.0)
                        .offset(y: showFeatures ? 0 : 50)
                        .animation(.easeOut(duration: 0.8).delay(Double(index) * 0.1), value: showFeatures)
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.vertical, 60)
        .background(Color(.systemBackground))
    }
}

struct FeatureCard: View {
    let feature: Feature
    @State private var isPressed = false
    
    var body: some View {
        VStack(spacing: 15) {
            Image(systemName: feature.icon)
                .font(.system(size: 40, weight: .medium))
                .foregroundColor(.blue)
                .frame(width: 80, height: 80)
                .background(Color.blue.opacity(0.1))
                .clipShape(Circle())
            
            Text(feature.title)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundColor(.primary)
                .multilineTextAlignment(.center)
            
            Text(feature.description)
                .font(.system(size: 14, weight: .regular))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
        }
        .padding(20)
        .background(Color(.systemGray6))
        .cornerRadius(20)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .onTapGesture {
            withAnimation {
                isPressed = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation {
                    isPressed = false
                }
            }
        }
    }
}

struct StatsSection: View {
    @Binding var showStats: Bool
    
    let stats = [
        Stat(value: "10,000+", label: "Active Users"),
        Stat(value: "99.9%", label: "Uptime"),
        Stat(value: "50M+", label: "Items Tracked"),
        Stat(value: "24/7", label: "Support")
    ]
    
    var body: some View {
        VStack(spacing: 30) {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 20) {
                ForEach(Array(stats.enumerated()), id: \.offset) { index, stat in
                    StatCard(stat: stat)
                        .opacity(showStats ? 1.0 : 0.0)
                        .scaleEffect(showStats ? 1.0 : 0.8)
                        .animation(.easeOut(duration: 0.8).delay(Double(index) * 0.1), value: showStats)
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.vertical, 60)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.blue, Color.purple]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

struct StatCard: View {
    let stat: Stat
    
    var body: some View {
        VStack(spacing: 10) {
            Text(stat.value)
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            Text(stat.label)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
        .background(Color.white.opacity(0.1))
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        )
    }
}

struct DemoSection: View {
    var body: some View {
        VStack(spacing: 30) {
            VStack(spacing: 15) {
                Text("See It In Action")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                
                Text("Experience the power of real-time inventory management")
                    .font(.system(size: 18, weight: .regular))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            // Phone mockup
            PhoneMockup()
                .frame(height: 400)
        }
        .padding(.vertical, 60)
        .background(Color(.systemGray6))
    }
}

struct PhoneMockup: View {
    var body: some View {
        ZStack {
            // Phone frame
            RoundedRectangle(cornerRadius: 30)
                .fill(Color(.systemGray5))
                .frame(width: 200, height: 400)
                .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
            
            // Screen
            RoundedRectangle(cornerRadius: 25)
                .fill(Color(.systemBackground))
                .frame(width: 180, height: 380)
            
            // App content
            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Inventory")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                    Image(systemName: "line.3.horizontal")
                        .foregroundColor(.white)
                }
                .padding()
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [Color.blue, Color.purple]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                
                // Content
                VStack(spacing: 15) {
                    // Quick stats
                    HStack(spacing: 10) {
                        VStack {
                            Text("1,247")
                                .font(.system(size: 16, weight: .bold))
                            Text("Total")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                        
                        VStack {
                            Text("23")
                                .font(.system(size: 16, weight: .bold))
                            Text("Low")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                    }
                    
                    // Items list
                    VStack(spacing: 10) {
                        ForEach(sampleItems, id: \.id) { item in
                            ItemRow(item: item)
                        }
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .frame(width: 180, height: 380)
            .clipShape(RoundedRectangle(cornerRadius: 25))
        }
    }
}

struct ItemRow: View {
    let item: InventoryItem
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
                
                Text(item.category)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("\(item.stock)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(item.stock < 20 ? .orange : .green)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(item.stock < 20 ? Color.orange.opacity(0.2) : Color.green.opacity(0.2))
                .cornerRadius(8)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

struct CTASection: View {
    var body: some View {
        VStack(spacing: 25) {
            Text("Ready to Transform Your Inventory Management?")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
            
            Text("Join thousands of businesses that have streamlined their operations with our platform.")
                .font(.system(size: 16, weight: .regular))
                .foregroundColor(.white.opacity(0.9))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Button(action: {
                // Start free trial action
            }) {
                HStack {
                    Image(systemName: "target")
                    Text("Start Free Trial")
                        .fontWeight(.semibold)
                }
                .foregroundColor(.blue)
                .padding(.horizontal, 40)
                .padding(.vertical, 15)
                .background(Color.white)
                .cornerRadius(25)
                .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
            }
        }
        .padding(.vertical, 60)
        .padding(.horizontal, 20)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.blue, Color.purple]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

// Placeholder views for other tabs
struct DashboardView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Dashboard")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Text("Coming Soon...")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Dashboard")
        }
    }
}

struct InventoryView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Inventory")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Text("Coming Soon...")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Inventory")
        }
    }
}

struct SettingsView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Settings")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Text("Coming Soon...")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Settings")
        }
    }
}

// Data models
struct Feature {
    let icon: String
    let title: String
    let description: String
}

struct Stat {
    let value: String
    let label: String
}

struct InventoryItem {
    let id = UUID()
    let name: String
    let category: String
    let stock: Int
}

// Sample data
let sampleItems = [
    InventoryItem(name: "Laptop Pro X1", category: "Electronics", stock: 45),
    InventoryItem(name: "Wireless Mouse", category: "Accessories", stock: 12),
    InventoryItem(name: "USB Cable", category: "Cables", stock: 89),
    InventoryItem(name: "Monitor 27\"", category: "Displays", stock: 8)
]

#Preview {
    ContentView()
} 