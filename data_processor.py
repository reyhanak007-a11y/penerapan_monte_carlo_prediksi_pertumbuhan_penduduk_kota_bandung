"""
Data Processor for Employment Data
"""

import pandas as pd
import numpy as np

class DataPreprocessor:
    def __init__(self, df):
        self.df = df.copy()
        
    def clean_data(self):
        """Basic data cleaning"""
        print("🧹 Cleaning data...")
        
        # 1. Standardize column names
        self.df.columns = [col.lower().strip() for col in self.df.columns]
        
        # 2. Handle missing values
        if 'jumlah_penduduk' in self.df.columns:
            self.df['jumlah_penduduk'] = pd.to_numeric(self.df['jumlah_penduduk'], errors='coerce')
            self.df['jumlah_penduduk'].fillna(0, inplace=True)
        
        if 'tahun' in self.df.columns:
            self.df['tahun'] = pd.to_numeric(self.df['tahun'], errors='coerce')
            self.df = self.df[self.df['tahun'].notna()]
            self.df['tahun'] = self.df['tahun'].astype(int)
        
        # 3. Standardize job types
        if 'jenis_pekerjaan' in self.df.columns:
            self.df['jenis_pekerjaan'] = self.df['jenis_pekerjaan'].astype(str).str.strip().str.title()
        
        print(f"✅ Cleaning complete. Shape: {self.df.shape}")
        return self
    
    def aggregate_data(self):
        """Aggregate data by year and job type"""
        print("📊 Aggregating data...")
        
        # Group by year and job type
        aggregated = self.df.groupby(['tahun', 'jenis_pekerjaan'])['jumlah_penduduk'].sum().reset_index()
        
        # Sort by year
        aggregated = aggregated.sort_values('tahun')
        
        # Calculate total per year
        yearly_totals = aggregated.groupby('tahun')['jumlah_penduduk'].sum().reset_index()
        yearly_totals.columns = ['tahun', 'total_population']
        
        # Merge with original data
        aggregated = pd.merge(aggregated, yearly_totals, on='tahun')
        
        # Calculate percentage
        aggregated['percentage'] = (aggregated['jumlah_penduduk'] / aggregated['total_population']) * 100
        
        print(f"✅ Aggregation complete. Shape: {aggregated.shape}")
        return aggregated
    
    def get_processed_data(self):
        """Get processed data"""
        cleaned_df = self.clean_data().df
        aggregated_df = self.aggregate_data()
        return cleaned_df, aggregated_df