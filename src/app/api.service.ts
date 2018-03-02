import { HttpModule } from '@angular/http';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import {User} from './models/user';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/map';
@Injectable()
export class ApiService {

  constructor(private httpClient:HttpClient) { }

  login(email:string,password:string){
    return this.httpClient.post<any>('/login',{email:email,password:password})
              .map(data=>{
                if(data){
                  localStorage.setItem('currentUser',JSON.stringify(data));
                }

                return data;
              })
  }

  register(email:string,password:string){
    return this.httpClient.post<any>('signup',{email:email,password:password})
              .map(data=>{
                return data;
              })
  }

  logout(){
    localStorage.removeItem('currentUser');
  }
}
