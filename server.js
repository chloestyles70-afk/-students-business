const express=require('express');
const path=require('path');
const Database=require('better-sqlite3');
const app=express();
const db=new Database('students-business.db');
db.pragma('journal_mode=WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,email TEXT UNIQUE,role TEXT DEFAULT 'buyer',campus TEXT,verified INTEGER DEFAULT 0,rating REAL DEFAULT 5); CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,seller_id INTEGER,title TEXT,description TEXT,category TEXT,price REAL,stock INTEGER,image TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,buyer_id INTEGER,product_id INTEGER,qty INTEGER,status TEXT DEFAULT 'pending',total REAL,commission REAL,created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY AUTOINCREMENT,buyer_id INTEGER,title TEXT,details TEXT,status TEXT DEFAULT 'open',created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,buyer_id INTEGER,seller_id INTEGER,rating INTEGER,comment TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
if(db.prepare('SELECT COUNT(*) c FROM users').get().c===0){
 const u=db.prepare('INSERT INTO users(name,email,role,campus,verified) VALUES(?,?,?,?,?)');
 const s=u.run('Campus Finds','seller@demo.com','seller','Main Campus',1).lastInsertRowid;
 u.run('Demo Student','buyer@demo.com','buyer','Main Campus',1);
 const p=db.prepare('INSERT INTO products(seller_id,title,description,category,price,stock,image) VALUES(?,?,?,?,?,?,?)');
 p.run(s,'Wireless Earbuds','Clean everyday earbuds with charging case.','Electronics',180,12,'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=900');
 p.run(s,'Calculus Notes Pack','Printed first-year mathematics notes.','Books & Notes',35,30,'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=900');
 p.run(s,'Campus Hoodie','Unisex hoodie, limited stock.','Fashion',120,8,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900');
}
app.use(express.json()); app.use(express.static(path.join(__dirname,'public')));
const commission=0.05;
app.get('/api/products',(req,res)=>{const q=(req.query.q||'').trim(); const rows=db.prepare(`SELECT p.*,u.name seller,u.verified FROM products p JOIN users u ON u.id=p.seller_id WHERE p.stock>0 AND (p.title LIKE ? OR p.description LIKE ? OR p.category LIKE ?) ORDER BY p.id DESC`).all('%'+q+'%','%'+q+'%','%'+q+'%');res.json(rows)});
app.get('/api/users',(req,res)=>res.json(db.prepare('SELECT id,name,email,role,campus,verified,rating FROM users ORDER BY id').all()));
app.post('/api/orders',(req,res)=>{const {buyer_id,product_id,qty=1}=req.body; const p=db.prepare('SELECT * FROM products WHERE id=?').get(product_id); if(!p||p.stock<qty)return res.status(400).json({error:'Not enough stock'}); const total=p.price*qty; const fee=total*commission; const info=db.prepare('INSERT INTO orders(buyer_id,product_id,qty,status,total,commission) VALUES(?,?,?,?,?,?)').run(buyer_id,product_id,qty,'pending',total,fee); db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(qty,product_id); res.json({id:info.lastInsertRowid,total,commission:fee})});
app.get('/api/orders',(req,res)=>res.json(db.prepare(`SELECT o.*,p.title,p.price,u.name buyer,s.name seller FROM orders o JOIN products p ON p.id=o.product_id JOIN users u ON u.id=o.buyer_id JOIN users s ON s.id=p.seller_id ORDER BY o.id DESC`).all()));
app.patch('/api/orders/:id',(req,res)=>{const allowed=['accepted','ready','completed','cancelled']; if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid status'}); db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,req.params.id);res.json({ok:true})});
app.post('/api/products',(req,res)=>{const {seller_id=1,title,description='',category='Other',price,stock=1,image=''}=req.body;if(!title||!price)return res.status(400).json({error:'Title and price required'});const r=db.prepare('INSERT INTO products(seller_id,title,description,category,price,stock,image) VALUES(?,?,?,?,?,?,?)').run(seller_id,title,description,category,price,stock,image);res.json({id:r.lastInsertRowid})});
app.post('/api/requests',(req,res)=>{const {buyer_id=2,title,details=''}=req.body;if(!title)return res.status(400).json({error:'Title required'});const r=db.prepare('INSERT INTO requests(buyer_id,title,details) VALUES(?,?,?)').run(buyer_id,title,details);res.json({id:r.lastInsertRowid})});
app.get('/api/requests',(req,res)=>res.json(db.prepare(`SELECT r.*,u.name buyer FROM requests r JOIN users u ON u.id=r.buyer_id ORDER BY r.id DESC`).all()));
app.get('/api/stats',(req,res)=>res.json({users:db.prepare('SELECT COUNT(*) c FROM users').get().c,products:db.prepare('SELECT COUNT(*) c FROM products').get().c,orders:db.prepare('SELECT COUNT(*) c FROM orders').get().c,revenue:db.prepare('SELECT COALESCE(SUM(commission),0) c FROM orders').get().c}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public/index.html')));
app.listen(process.env.PORT||3000,()=>console.log('Students Business running on port '+(process.env.PORT||3000)));
