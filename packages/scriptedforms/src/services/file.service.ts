// scriptedforms
// Copyright (C) 2017 Simon Biggs

// Licensed under both the Apache License, Version 2.0 (the "Apache-2.0") and 
// GNU Affrero General Public License as published by the Free Software 
// Foundation, either version 3 of the License, or (at your option) any later 
// version (the "AGPL-3.0+").

// You may not use this file except in compliance with both the Apache-2.0 AND 
// the AGPL-3.0+ in combination (the "Combined Licenses").

// You may obtain a copy of the AGPL-3.0+ at

//     https://www.gnu.org/licenses/agpl-3.0.txt

// You may obtain a copy of the Apache-2.0 at 

//     https://www.apache.org/licenses/LICENSE-2.0.html

// Unless required by applicable law or agreed to in writing, software
// distributed under the Combined Licenses is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See 
// the Combined Licenses for the specific language governing permissions and 
// limitations under the Combined Licenses.

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  PromiseDelegate
} from '@phosphor/coreutils';


import { JupyterService } from './jupyter.service';
import { TemplateService } from './template.service';
import { KernelService } from './kernel.service';

// https://stackoverflow.com/a/6969486/3912576
function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

@Injectable()
export class FileService {
  path: BehaviorSubject<string> = new BehaviorSubject('scriptedforms_default_path')
  renderType: 'template' | 'results'
  node: HTMLElement

  baseUrl = document.getElementsByTagName("base")[0].href

  renderComplete: PromiseDelegate<void>

  constructor(
    private myTemplateService: TemplateService,
    private myJupyterService: JupyterService,
    private myKernelService: KernelService
  ) { }

  setNode(node: HTMLElement) {
    this.node = node
  }

  setRenderType(renderType: 'template' | 'results') {
    if ((renderType !== 'template') && (renderType !== 'results')) {
      throw new RangeError('renderType must be either template or results')
    }

    this.renderType = renderType
  }

  handleFileContents(fileContents: string) {
    let priorOverflow = this.node.scrollTop
    this.renderComplete = new PromiseDelegate<void>()

    this.renderComplete.promise.then(() => {
      this.node.scrollTop = priorOverflow
    })

    if (this.renderType === 'template') {
      this.myTemplateService.setTemplate(fileContents)
    }
    if (this.renderType === 'results') {
      console.log('not yet implemented')
    }

    return this.renderComplete.promise
  }

  loadFileContents(): Promise<void> {
    return this.myJupyterService.contentsManager.get(this.path.getValue()).then(model => {
      let fileContents: string = model.content
      return this.handleFileContents(fileContents)
    })
  }

  setPath(path: string) {
    this.path.next(path);
  }

  determineRenderType(path: string) {
    let renderType: "template" | "results"
    let extension = path.split('.').pop();
    if (extension === 'md') {
      renderType = "template"
    } else if (extension === 'json') {
      renderType = 'results'
    } else {
      throw RangeError('File extension not recognised.')
    }

    return renderType
  }

  resetPromises() {
    this.myKernelService.sessionConnected = new PromiseDelegate<void>();
    this.myKernelService.queue = this.myKernelService.sessionConnected.promise
  }

  openFile(path: string, renderType?: "template" | "results") {
    this.setPath(path);

    if (!renderType) {
      renderType = this.determineRenderType(path)
    }

    this.setRenderType(renderType);
    this.resetPromises()
    this.loadFileContents().then(() => {
      this.myKernelService.sessionConnect(this.path.getValue());
    });
  }

  urlToFilePath(url: string) {
    let pattern = RegExp(`^${escapeRegExp(this.baseUrl)}(.*\.(md|json))`)
    let match = pattern.exec(url)
    if (match !== null) {
      return match[1]
    } else {
      return null
    }
  }

}