import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { CameraPhoto, CameraResultType, CameraSource, Capacitor, FilesystemDirectory, Plugins } from '@capacitor/core';


const {Camera,Filesystem,Storage} = Plugins;

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  public dataFoto:Photo[]=[];
  public keyFoto:string="foto";
  private platform : Platform;
  constructor(platform: Platform) { this.platform = platform; }

  public async storePhoto(foto : CameraPhoto){
    const base64Data = await this.readAsbase64(foto);

    const namaFile = new Date().getTime()+'.jpeg';
    const simpanFile = await Filesystem.writeFile({
      path : namaFile,
      data : base64Data,
      directory : FilesystemDirectory.Data
    });

    const response = await fetch(foto.webPath);
    const blob = await response.blob();
    const dataFoto = new File([blob], foto.path, {
      type : "image/jpeg"
    })

    if (this.platform.is('hybrid')) {
      return {
        filePath : simpanFile.uri,
        webviewPath : Capacitor.convertFileSrc(simpanFile.uri),
        dataImage : dataFoto
      }
    } else {
      return{
        filePath : namaFile,
        webviewPath : foto.webPath,
        dataImage : dataFoto
      }
    }
  }

  public async addPhoto() {
    const Foto = await Camera.getPhoto({
      resultType : CameraResultType.Uri,
      source : CameraSource.Camera,
      quality : 100
    });
    console.log(Foto);

    const fileFoto = await this.storePhoto(Foto);

    this.dataFoto.unshift(fileFoto);

    Storage.set({
      key : this.keyFoto,
      value: JSON.stringify(this.dataFoto)
    })
  }

  
  convertBlobtoBase64 = (blob : Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    }
    reader.readAsDataURL(blob);
  });

  private async readAsbase64(foto : CameraPhoto){
    if(this.platform.is('hybrid')){
      const file = await Filesystem.readFile({
        path : foto.webPath,
      });
      return file.data
    }else{
      const respone = await fetch (foto.webPath);
      const blob = await respone.blob();

      return await this.convertBlobtoBase64(blob) as string;
    }
  }

  public async loadFoto(){
    const listFoto = await Storage.get({key: this.keyFoto});
    this.dataFoto = JSON.parse(listFoto.value) || [];

    if(!this.platform.is('hybrid')){
      for ( let foto of this.dataFoto){
        const readFile = await Filesystem.readFile({
          path : foto.filePath,
          directory : FilesystemDirectory.Data
        });
        foto.webviewPath = `data:image/jpeg;base64,${readFile.data}`;

        const response = await fetch(foto.webviewPath);
        const blob = await response.blob();

        foto.dataImage = new File([blob], foto.filePath,{
          type : "image/jpeg"
        });
      }
    }
  }

 
}

export interface Photo{
  filePath : string;
  webviewPath : string;
  dataImage : File;
}
