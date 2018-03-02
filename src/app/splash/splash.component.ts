import { ApiService } from './../api.service';
import { Component, OnInit } from '@angular/core';
import {FormControl,Validators,FormGroup,FormBuilder,AbstractControl} from '@angular/forms';
import { validateEmail } from './validator';
import {Router,ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.css'],
  providers:[ApiService]
})


export class SplashComponent implements OnInit{
  constructor(private apiService:ApiService,private router:Router,private route:ActivatedRoute){

  }

  hide=true;
  passwordMatched=true;
  passwordEmpty=false;
  loginAlertType=null;
  loginAlertMessage='';
  registerAlertType=null;
  registerAlertMessage='';
  selectedIndex:number=0;
  loginEmail=new FormControl('',[Validators.email,Validators.required]);
  loginPassword=new FormControl('',[Validators.required]);
  btnLoginDisabled=false;
  btnRegisterDisabled=false;

  registerEmail=new FormControl('',[Validators.email,Validators.required]);
  registerPassword=new FormControl('',[Validators.required]);
  registerConfirmPassword=new FormControl('',[Validators.required]);

  loginForm=new FormGroup({
    email:this.loginEmail,
    password:this.loginPassword
  });

  registerForm=new FormGroup({
    email:this.registerEmail,
    password:this.registerPassword,
    confirmPassword:this.registerConfirmPassword
  });


  ngOnInit(){
    if(localStorage.getItem('currentUser')!=null){
      console.log('Navigating to dashboard');
      this.router.navigate(['dashboard']);
    }else{
      this.selectedIndex=0;
    console.log('Selected index: '+this.selectedIndex);
    this.registerConfirmPassword.valueChanges.subscribe(confirmPasswordValue=>{
      if(confirmPasswordValue!=''&&this.registerPassword.value!=''){
        this.passwordEmpty=false;
        if(confirmPasswordValue==this.registerPassword.value){
          this.passwordMatched=true;
        }else{
          this.passwordMatched=false;
        }
      }else{
        if(confirmPasswordValue==''){
          this.passwordEmpty=true;
        }else{
          this.passwordEmpty=false;
        }
      }      
    });

    this.loginEmail.valueChanges.subscribe(data=>{
      this.loginAlertType=null;
    });

    this.loginPassword.valueChanges.subscribe(data=>{
      this.loginAlertType==null;
    })
    }
    
  }


  onLoginSubmit(){
    if(this.loginForm.valid){
      //reset login status
      this.apiService.logout();
      this.btnLoginDisabled=true;
      this.apiService.login(this.loginEmail.value,this.loginPassword.value)
                      .subscribe(
                        data=>{
                          console.log('login result: '+JSON.stringify(data));
                          if(data.success){
                            this.loginAlertMessage=' Login successful';
                            this.loginAlertType='Success';
                            setTimeout(() => 
                            {
                              console.log('Navigating to dashboard');
                                this.router.navigate(['dashboard']);
                            },2000);
                          }else{
                            this.loginAlertMessage=' '+data.data;
                            this.loginAlertType='Error';
                            this.btnLoginDisabled=false;
                          }
                        },
                        error=>{
                          console.log('Error in login: '+error);
                          this.loginAlertMessage='Something went wrong';
                          this.loginAlertType='Error';
                          this.btnLoginDisabled=false;
                        }
                      );

    }else{
      console.log('Login form is not valid');
    }
  }

  onRegisterSubmit(){
    if(this.registerForm.valid){
      this.btnRegisterDisabled=true;
      this.apiService.register(this.registerEmail.value,this.registerPassword.value)
                      .subscribe(
                        data=>{
                          console.log('register result: '+JSON.stringify(data));
                          if(data.success){
                            this.registerAlertMessage=' Register successful';
                            this.registerAlertType='Success';
                            console.log('Selected: '+this.selectedIndex);
                            setTimeout(() => 
                            {
                              console.log('Changing selected index');
                              this.selectedIndex=0;
                            },2000);
                          }else{
                            this.registerAlertMessage=' '+data.data;
                            this.registerAlertType='Error';
                            this.btnRegisterDisabled=false;
                          }
                        },
                        error=>{
                          console.log('Error in login: '+error);
                          this.registerAlertMessage='Something went wrong';
                          this.registerAlertType='Error';
                          this.btnRegisterDisabled=false;
                        }
                      );

    }else{
      console.log('Register form is not valid');
    }
  }

  changeIndex(){
    console.log('previous index: '+this.selectedIndex);
    this.selectedIndex=0;
    console.log('changing index: '+this.selectedIndex);
  }

  getLoginEmailErrorMessage(){
    return this.loginEmail.hasError('required')?'You must enter an email address':
    this.loginEmail.hasError('email')?'Not a valid email':'';
  }

  getLoginPasswordErrorMessage(){
    return this.loginPassword.hasError('required')?'You must enter a password':'';
  }

  getRegisterEmailErrorMessage(){
    return this.registerEmail.hasError('required')?'You must enter an email address':
    this.registerEmail.hasError('email')?'Not a valid email':'';
  }



  getRegisterPasswordErrorMessage(){
    return this.registerPassword.hasError('required')?'You must enter a password':'';
  }

  
  getRegisterConfirmPasswordErrorMessage(){
    if(this.registerConfirmPassword.hasError('required')){
      return 'You need to retype password';
    }else{
      console.log('Trying to match passwords: '+this.passwordMatched);
      return this.passwordMatched==false?'Passwords do not match':'';
    }
  }

  
}