import { Component, OnInit, NgZone } from '@angular/core'
import { ChangeDetectorRef } from '@angular/core'
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { Web3Service } from './../Web3Service'
import { PessoaJuridicaService } from '../pessoa-juridica.service';

import { BnAlertsService } from 'bndes-ux4'

import { LiquidacaoResgate } from './liquidacao-resgate'
import { UploadService } from '../shared/upload.service';
import { Utils } from '../shared/utils';

@Component({
  selector: 'app-liquidacao-resgate',
  templateUrl: './liquidacao-resgate.component.html',
  styleUrls: ['./liquidacao-resgate.component.css']
})
export class LiquidacaoResgateComponent implements OnInit {

  liquidacaoResgate: LiquidacaoResgate;

  selectedAccount: any;

  solicitacaoResgateId: string;
  maskCnpj: any;  


  constructor(private pessoaJuridicaService: PessoaJuridicaService,
    private bnAlertsService: BnAlertsService,
    private web3Service: Web3Service,
    private uploadService: UploadService,
    private ref: ChangeDetectorRef,
    private zone: NgZone, private router: Router, private route: ActivatedRoute, ) { }

  ngOnInit() {

    this.maskCnpj = Utils.getMaskCnpj();      

    let self = this;
    setInterval(function () {
      self.recuperaContaSelecionada(), 1000});  
      
    this.liquidacaoResgate = new LiquidacaoResgate();
    this.liquidacaoResgate.hashResgate = this.route.snapshot.paramMap.get('solicitacaoResgateId');

    console.log(this.liquidacaoResgate.hashResgate);

    self.recuperaStatusResgate();
    self.recuperaStatusLiquidacaoResgate();    

  }



  async recuperaContaSelecionada() {
    
    let self = this;
    
    let newSelectedAccount = await this.web3Service.getCurrentAccountSync();

    if ( !self.selectedAccount || (newSelectedAccount !== self.selectedAccount && newSelectedAccount)) {

      this.selectedAccount = newSelectedAccount;
      console.log("selectedAccount=" + this.selectedAccount);

    }
  }  


  recuperaStatusResgate() {

    let self = this;

    this.web3Service.registraEventosResgate(function (error, event) {
      if (!error) {
        let eventoResgate = event;

        if (self.liquidacaoResgate.hashResgate == eventoResgate.transactionHash) {

          self.pessoaJuridicaService.recuperaEmpresaPorCnpj(eventoResgate.args.cnpj).subscribe(
            data => {
  
              self.liquidacaoResgate.razaoSocial = data.dadosCadastrais.razaoSocial;
              self.liquidacaoResgate.cidadeResgate = data.dadosCadastrais.cidade;
              self.liquidacaoResgate.cnpj = eventoResgate.args.cnpj;
              self.liquidacaoResgate.valorResgate = self.web3Service.converteInteiroParaDecimal(parseInt(eventoResgate.args.valor)),
          
              self.web3Service.getBlockTimestamp(eventoResgate.blockHash,
                function (error, result) {
                  if (!error) {
                    self.liquidacaoResgate.dataHoraResgate = new Date(result.timestamp * 1000);
                   }
                  else {
                    console.log("Erro ao recuperar data e hora do bloco");
                    console.error(error);
                  }
                });
            })
  
          
        }

      }
      else {
        console.log("Erro no registro de eventos de resgate");
        console.log(error);
      }

    });
  }


  recuperaStatusLiquidacaoResgate() {
    let self = this

    this.web3Service.registraEventosLiquidacaoResgate(function (error, event) {

      if (!error) {   

          console.log("Encontrou algum dado")
          console.log(event)

          if (self.liquidacaoResgate.hashResgate == event.args.hashResgate) { //resgate jah foi liquidado

            self.liquidacaoResgate.hashID       = event.transactionHash;
            self.liquidacaoResgate.hashComprovacao = event.args.hashComprovante;
            self.liquidacaoResgate.isLiquidado = true;

            self.web3Service.getBlockTimestamp(event.blockHash,
              function (error, result) {
                if (!error) {
                  self.liquidacaoResgate.dataHoraLiquidacao = new Date(result.timestamp * 1000);
                 }
                else {
                  console.log("Erro ao recuperar data e hora do bloco");
                  console.error(error);
                }
              });



          }

      } else {
        console.log("Erro no registro de eventos de liquidacao do resgate");
        console.log(error);

      }
    })
  }


  async liquidar() {
    
    console.log("Liquidando o resgate..");
    console.log("hashResgate" + this.liquidacaoResgate.hashResgate);
    console.log("hashComprovacao" + this.liquidacaoResgate.hashComprovacao);    


    let bRS = await this.web3Service.isResponsibleForSettlementSync(this.selectedAccount);
    if (!bRS) {
      let s = "Conta não é do responsável pela liquidação";
      this.bnAlertsService.criarAlerta("error", "Erro", s, 5);
      return;
    }

    if (!this.liquidacaoResgate.hashComprovacao) {
      let s = "O hash da comprovação é um Campo Obrigatório";
      this.bnAlertsService.criarAlerta("error", "Erro", s, 2);
      return;
    }

    let self= this;


    this.web3Service.liquidaResgate(this.liquidacaoResgate.hashResgate, this.liquidacaoResgate.hashComprovacao, true,
      function (success) {
          console.log("success: " + success)
          self.router.navigate(['sociedade/dash-transf']);          
      },
      function (error) {
          console.log("error: " + error)
      })


  }

}
