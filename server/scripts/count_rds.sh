#!/bin/bash
export DATABASE_URL="postgresql://postgres:InstaToken%232026Secure@instatoken-db-restored.c1gqoogyq5b6.ap-south-2.rds.amazonaws.com:5432/instatoken_prod?sslmode=no-verify"
cd /home/ubuntu/Instatoken/server
node -e "
const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},});
pool.query('SELECT COUNT(*) FROM tokens')
  .then(r=>{
    console.log('tokens:', r.rows[0].count);
    return pool.query('SELECT COUNT(*) FROM appointments');
  })
  .then(r=>{
    console.log('appointments:', r.rows[0].count);
    pool.end();
  })
  .catch(e=>{console.error('ERR:',e.message); pool.end();});
"
