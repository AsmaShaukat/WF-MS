# db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus

username = ""
password = ""
host = "localhost\\SQLEXPRESS"
port = ""
database = "Attendance_System"
driver = "ODBC+Driver+17+for+SQL+Server"

# Build SQLAlchemy DSN
DATABASE_URL = (
    f"mssql+pyodbc://@{host}/{database}"
    f"?driver={driver}&TrustServerCertificate=yes&Trusted_Connection=yes"
)

# Create engine with recommended SQL Server configs
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,        # <-- KEY FIX
    pool_recycle=1800,         # recycle idle connections every 30 minutes
    connect_args={
        "timeout": 30,
        "ConnectionTimeout": 30,
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)