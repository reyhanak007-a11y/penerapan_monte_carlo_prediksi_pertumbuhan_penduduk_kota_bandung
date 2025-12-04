import os
from datetime import timedelta

class Config:
    """Base configuration"""
    
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # File upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'csv', 'xlsx'}
    
    # Session
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)
    
    # CORS
    CORS_HEADERS = 'Content-Type'
    
    # Data
    DATA_PATH = 'data/raw/jumlah_penduduk_kota_bandung_berdasarkan_jenis_pekerjaan.csv'
    
    # Monte Carlo defaults
    DEFAULT_SIMULATIONS = 5000
    DEFAULT_TARGET_YEAR = 2030
    DEFAULT_CONFIDENCE_LEVEL = 0.95
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration"""
        # Create necessary directories
        os.makedirs('data/raw', exist_ok=True)
        os.makedirs('outputs', exist_ok=True)
        os.makedirs('uploads', exist_ok=True)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}