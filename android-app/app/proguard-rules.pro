# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-keep,includedescriptorclasses class ca.lartisan.menu.**$$serializer { *; }
-keepclassmembers class ca.lartisan.menu.** { *** Companion; }
-keepclasseswithmembers class ca.lartisan.menu.** { kotlinx.serialization.KSerializer serializer(...); }
