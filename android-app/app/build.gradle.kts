plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ca.lartisan.menu"
    compileSdk = 34

    defaultConfig {
        applicationId = "ca.lartisan.menu"
        minSdk = 24
        targetSdk = 34
        versionCode = 6
        versionName = "2.0.0"
    }

    buildTypes {
        release {
            // Unsigned-by-default release; Android Studio "Build > Generate Signed App Bundle / APK" signs it.
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    // Version 2.0 sources live in src/main/kt (flat folder); the old Compose code under src/main/java is no longer compiled
    // and can be deleted.
    sourceSets { getByName("main") { java.setSrcDirs(listOf("src/main/kt")) } }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

dependencies {
    // The app is a thin shell around the web menu (/tablette on the café server): no UI framework needed.
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.webkit:webkit:1.11.0")
}
