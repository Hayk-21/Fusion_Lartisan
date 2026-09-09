# Persistent raw-print worker for Windows. Started once by the server; compiles the winspool helper once,
# then reads one job per line on stdin:  <printer name>\t<file path>   and answers  OK  or  ERR <message>.
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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
Write-Output "READY"
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line.Trim() -eq '') { continue }
  $parts = $line.Split("`t")
  try {
    [RawPrinter]::Send($parts[0], [System.IO.File]::ReadAllBytes($parts[1]))
    Write-Output "OK"
  } catch {
    Write-Output ("ERR " + $_.Exception.Message.Replace("`n", " "))
  }
}
