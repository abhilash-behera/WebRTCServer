import {FormControl} from '@angular/forms';

export function validateEmail(password: FormControl,confirmPassword:FormControl) {
    console.log('Password: '+password.value+' and ConfirmPassword: '+confirmPassword.value);
  if(password.value!=confirmPassword.value){
      return {passwordMatch:false};
  }else{
      return null;
  }
}