#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pdfplumber

# Mimari Güncelleme PDF
pdf_path_1 = r'c:\Users\notop\OneDrive\Masaüstü\Nutopiano\Nutopiano_Mimari_Guncelleme_v2.pdf'
pdf_path_2 = r'c:\Users\notop\OneDrive\Masaüstü\Nutopiano\Nutopiano_Panel_Spesifikasyonu_v1.pdf'

print("=" * 80)
print("NUTOPIANO_MIMARI_GUNCELLEME_V2.PDF")
print("=" * 80)

try:
    with pdfplumber.open(pdf_path_1) as pdf:
        print(f"\nToplam Sayfa: {len(pdf.pages)}\n")
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                print(f"\n{'='*60}\nSAYFA {i+1}\n{'='*60}\n{text}\n")
except Exception as e:
    print(f"HATA: {e}")

print("\n\n")
print("=" * 80)
print("NUTOPIANO_PANEL_SPESIFIKASYONU_V1.PDF")
print("=" * 80)

try:
    with pdfplumber.open(pdf_path_2) as pdf:
        print(f"\nToplam Sayfa: {len(pdf.pages)}\n")
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                print(f"\n{'='*60}\nSAYFA {i+1}\n{'='*60}\n{text}\n")
except Exception as e:
    print(f"HATA: {e}")
