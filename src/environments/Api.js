import axios from 'axios';

export const API = axios.create({
  baseURL: 'https://nipunodisha.in/nipun/', //pro
  // baseURL: 'https://tatvagyan.co.in/nipun/', //test
  // baseURL: 'https://thinkzone.co.in/nipun/', //OLDprod
  // baseURL: 'http://localhost:1234//nipun/', //test

  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const app_version = 'v 1.37';
