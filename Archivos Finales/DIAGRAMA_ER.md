erDiagram
      Campus {
          TEXT id PK
          TEXT name
          TEXT address
          FLOAT8 lat
          FLOAT8 lng
          INT total_spaces
          BOOLEAN is_active
          TIMESTAMPTZ created_at
          TIMESTAMPTZ updated_at
      }
      User {
          TEXT id PK
          TEXT email
          TEXT password_hash
          TEXT role
          TEXT first_name
          TEXT last_name
          TEXT phone
          TEXT carnet
          TEXT nfc_card_id
          TEXT qr_code
          BOOLEAN is_active
          TIMESTAMPTZ last_login_at
          TIMESTAMPTZ deleted_at
      }
      Vehicle {
          TEXT id PK
          TEXT user_id FK
          TEXT placa
          TEXT brand
          TEXT model
          TEXT color
          INT year
          BOOLEAN is_authorized
          BOOLEAN blacklisted
          TEXT blacklist_reason
          TIMESTAMPTZ deleted_at
      }
      ParkingSpace {
          TEXT id PK
          TEXT campus_id FK
          TEXT code
          TEXT zone
          INT floor
          TEXT type
          TEXT status
          BOOLEAN is_active
          FLOAT8 lat
          FLOAT8 lng
          TIMESTAMPTZ last_sensor_update
      }
      ParkingSession {
          TEXT id PK
          TEXT vehicle_id FK
          TEXT space_id FK
          TEXT user_id FK
          TIMESTAMPTZ entry_time
          TIMESTAMPTZ exit_time
          TEXT entry_method
          TEXT status
          INT duration_minutes
          FLOAT8 amount_due
          BOOLEAN is_paid
          TEXT operator_entry_id
          TEXT operator_exit_id
          TEXT notes
      }
      Payment {
          TEXT id PK
          TEXT session_id FK
          TEXT user_id FK
          FLOAT8 amount
          TEXT payment_method
          TEXT status
          TEXT transaction_reference
          TIMESTAMPTZ paid_at
      }
      Reservation {
          TEXT id PK
          TEXT user_id FK
          TEXT vehicle_id FK
          TEXT space_id FK
          TIMESTAMPTZ start_time
          TIMESTAMPTZ end_time
          TEXT status
          TEXT type
          TEXT notes
      }
      ParkingSubscription {
          TEXT id PK
          TEXT user_id FK
          TEXT type
          TEXT status
          TIMESTAMPTZ start_date
          TIMESTAMPTZ end_date
          NUMERIC amount_paid
          TEXT payment_reference
          BOOLEAN auto_renew
      }
      ParkingEvent {
          TEXT id PK
          TEXT name
          TEXT description
          TIMESTAMPTZ event_date
          TIMESTAMPTZ start_time
          TIMESTAMPTZ end_time
          TEXT tariff_mode
          NUMERIC flat_rate
          TEXT affected_zones
          TEXT status
          TEXT created_by_user_id FK
          BOOLEAN uses_external_parking
          BOOLEAN shuttle_available
          INT capacity_override
      }
      AuditLog {
          TEXT id PK
          TEXT user_id FK
          TEXT action
          TEXT resource
          TEXT resource_id
          JSONB metadata
          TEXT ip_address
          TEXT user_agent
          TIMESTAMPTZ created_at
      }
      Blacklist {
          TEXT id PK
          TEXT vehicle_id FK
          TEXT reason
          TEXT added_by_user_id FK
          BOOLEAN is_active
          TIMESTAMPTZ removed_at
          TEXT removed_by_user_id FK
      }
      Notification {
          TEXT id PK
          TEXT user_id FK
          TEXT type
          TEXT title
          TEXT message
          BOOLEAN is_read
          TIMESTAMPTZ read_at
          JSONB metadata
          TIMESTAMPTZ created_at
      }
      BarrierLog {
          TEXT id PK
          TEXT barrier_id
          TEXT action
          TEXT trigger_source
          TEXT operator_id FK
          TEXT session_id
          TEXT notes
          TIMESTAMPTZ created_at
      }
      VisitorQR {
          TEXT id PK
          TEXT qr_code
          TEXT generated_by_user_id FK
          TEXT visitor_name
          TEXT vehicle_plate
          TEXT purpose
          TIMESTAMPTZ expires_at
          BOOLEAN is_used
          TIMESTAMPTZ used_at
          TEXT session_id FK
      }
      Camera {
          TEXT id PK
          TEXT name
          TEXT location
          TEXT stream_url
          BOOLEAN has_lpr
          BOOLEAN is_active
          FLOAT8 lat
          FLOAT8 lng
          TEXT campus_id FK
      }
      MonthlyBill {
          TEXT id PK
          TEXT user_id FK
          INT month
          INT year
          INT total_sessions
          INT total_minutes
          NUMERIC total_amount
          TEXT status
          TIMESTAMPTZ due_date
          TIMESTAMPTZ paid_at
          TEXT payment_reference
      }
      CardReplacement {
          TEXT id PK
          TEXT user_id FK
          TEXT old_nfc_token
          TEXT new_nfc_token
          TEXT reason
          NUMERIC replacement_fee
          BOOLEAN fee_paid
          TIMESTAMPTZ requested_at
          TIMESTAMPTZ processed_at
          TEXT processed_by_user_id FK
      }
      User           ||--o{ Vehicle             : "tiene"
      User           ||--o{ ParkingSession      : "genera"
      User           ||--o{ Reservation         : "hace"
      User           ||--o{ ParkingSubscription : "contrata"
      User           ||--o{ AuditLog            : "registra"
      User           ||--o{ Notification        : "recibe"
      User           ||--o{ MonthlyBill         : "acumula"
      User           ||--o{ CardReplacement     : "solicita"
      User           ||--o{ ParkingEvent        : "crea"
      Campus         ||--o{ ParkingSpace        : "contiene"
      Campus         ||--o{ Camera              : "tiene"
      Vehicle        ||--o{ ParkingSession      : "genera"
      Vehicle        ||--o{ Reservation         : "usa"
      Vehicle        ||--o{ Blacklist           : "puede estar en"
      ParkingSpace   ||--o{ ParkingSession      : "aloja"
      ParkingSpace   ||--o{ Reservation         : "reservada en"
      ParkingSession ||--|| Payment             : "genera pago"
      ParkingSession ||--o| VisitorQR           : "vinculada a"
      VisitorQR      }o--|| User               : "generado por"
      BarrierLog     }o--|| User               : "operado por"
      Blacklist      }o--|| User               : "agregado por"
      CardReplacement}o--|| User               : "procesado por"
      ParkingEvent   }o--|| User               : "creado por"