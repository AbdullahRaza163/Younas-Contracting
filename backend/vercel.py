from app import app

# Vercel expects this variable named 'app'
application = app

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)