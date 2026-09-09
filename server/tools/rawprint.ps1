# Sends a file of raw printer bytes (Star Line Mode / ESC/POS) to a Windows printer through the spooler (RAW datatype).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File rawprint.ps1 -Printer "Star TSP650 (TSP654)" -File ticket.bin
param([Parameter(Mandatory=$true)][string]$Printer, [Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DOCINFOW {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] public static extern bool OpenPrinter(string name, out IntPtr h, IntPtr pd);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] public static extern bool StartDocPrinter(IntPtr h, int level, ref DOCINFOW di);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool WritePrinter(IntPtr h, IntPtr buf, int len, out int written);
  public static void Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("Imprimante introuvable : " + printer + " (erreur " + Marshal.GetLastWin32Error() + ")");
    try {
      DOCINFOW di = new DOCINFOW(); di.pDocName = "L'Artisan - ticket"; di.pDataType = "RAW";
      if (!StartDocPrinter(h, 1, ref di)) throw new Exception("StartDocPrinter a échoué (erreur " + Marshal.GetLastWin32Error() + ")");
      StartPagePrinter(h);
      IntPtr p = Marshal.AllocHGlobal(data.Length);
      Marshal.Copy(data, 0, p, data.Length);
      int written; bool ok = WritePrinter(h, p, data.Length, out written);
      Marshal.FreeHGlobal(p);
      EndPagePrinter(h); EndDocPrinter(h);
      if (!ok) throw new Exception("WritePrinter a échoué (erreur " + Marshal.GetLastWin32Error() + ")");
    } finally { ClosePrinter(h); }
  }
}
"@
[RawPrinter]::Send($Printer, [System.IO.File]::ReadAllBytes($File))
Write-Output "OK"
