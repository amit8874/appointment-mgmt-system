export const INVOICE_LAYOUTS = [
  {
    id: 'layout-standard',
    name: 'Elite Standard',
    type: 'standard',
    thumbnail: 'Elite',
    html: `
      <div class="p-12 font-inherit" style="color: var(--secondary-color); font-family: var(--font-family);">
        <div class="flex justify-between items-start mb-12 border-b-4 pb-8" style="border-color: var(--primary-color);">
          <div>
            {{#if showLogo}}<div class="mb-4">{{clinic_logo}}</div>{{/if}}
            <h1 class="text-4xl font-black uppercase tracking-tighter" style="color: var(--primary-color);">{{clinic_name}}</h1>
            <p class="text-sm opacity-70">{{clinic_address}}</p>
            <p class="text-sm opacity-70">Ph: {{clinic_phone}} | {{clinic_email}}</p>
          </div>
          <div class="text-right">
            <h2 class="text-6xl font-black opacity-10 mb-2">INVOICE</h2>
            <p class="font-bold">#{{invoice_number}}</p>
            <p class="text-sm opacity-60">{{date}}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-12 mb-12 bg-gray-50 p-6 rounded-xl border border-gray-100">
          {{#if showPatientId}}
          <div>
            <p class="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest text-primary">Billed To</p>
            <p class="text-xl font-bold">{{patient_name}}</p>
            <p class="text-sm opacity-60">ID: {{patient_id}}</p>
          </div>
          {{/if}}
          {{#if showDoctor}}
          <div class="text-right">
            <p class="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest text-primary">Consultant</p>
            <p class="text-xl font-bold">Dr. {{doctor_name}}</p>
          </div>
          {{/if}}
        </div>

        <table class="w-full mb-12">
          <thead style="background: var(--primary-color); color: white;">
            <tr>
              <th class="p-4 text-left rounded-l-lg">Description</th>
              <th class="p-4 text-center">Qty</th>
              <th class="p-4 text-right">Unit Price</th>
              <th class="p-4 text-right rounded-r-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {{items_table}}
          </tbody>
        </table>

        <div class="flex justify-end pt-8 border-t-2 border-dashed">
          <div class="w-64 space-y-3">
            <div class="flex justify-between opacity-60"><span>Subtotal</span><span>{{subtotal}}</span></div>
            {{#if showGst}}<div class="flex justify-between opacity-60"><span>GST (18%)</span><span>{{tax_amount}}</span></div>{{/if}}
            <div class="flex justify-between opacity-60"><span>Discount</span><span>-{{discount}}</span></div>
            <div class="flex justify-between items-center pt-4 border-t border-gray-200">
              <span class="font-black uppercase text-sm">Total Amount</span>
              <span class="text-3xl font-black" style="color: var(--primary-color);">{{total_amount}}</span>
            </div>
          </div>
        </div>

        <div class="mt-24 text-[10px] opacity-40 uppercase tracking-[0.3em] text-center">
            This is a computer generated invoice. No signature required.
        </div>
      </div>
    `
  },
  {
    id: 'layout-modern',
    name: 'Modern Gradient',
    type: 'modern',
    html: `
      <div class="font-inherit relative overflow-hidden" style="color: var(--secondary-color); font-family: var(--font-family);">
        <div class="h-4 w-full" style="background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));"></div>
        <div class="p-16">
          <div class="flex justify-between items-center mb-16">
            {{#if showLogo}}<div>{{clinic_logo}}</div>{{/if}}
            <div class="text-right bg-gray-50 px-8 py-4 rounded-3xl border border-gray-100">
                <span class="text-[50px] font-black leading-none block" style="color: var(--primary-color);">INVOICE</span>
                <span class="text-sm font-bold opacity-40">#{{invoice_number}} / {{date}}</span>
            </div>
          </div>

          <div class="mb-16">
            <h1 class="text-3xl font-black mb-1">{{clinic_name}}</h1>
            <p class="text-sm opacity-60 max-w-sm">{{clinic_address}} | {{clinic_phone}}</p>
          </div>

          <div class="grid grid-cols-3 gap-8 mb-16">
             <div class="col-span-2 bg-gradient-to-br from-gray-50 to-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <span class="text-[10px] font-black uppercase tracking-widest opacity-30 block mb-4">Patient Information</span>
                <div class="flex items-center gap-6">
                   <div class="w-16 h-16 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center text-2xl font-black overflow-hidden" style="color: var(--primary-color);">
                     {{#if patient_avatar}}<img src="{{patient_avatar}}" />{{else}}{{patient_initials}}{{/if}}
                   </div>
                   <div>
                     <h2 class="text-2xl font-black">{{patient_name}}</h2>
                     {{#if showPatientId}}<p class="text-sm opacity-50">Patient Registry ID: {{patient_id}}</p>{{/if}}
                   </div>
                </div>
             </div>
             <div class="bg-indigo-600 p-8 rounded-[40px] text-white flex flex-col justify-center" style="background: var(--primary-color);">
                <span class="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2 text-center">Amount Due</span>
                <h3 class="text-3xl font-black text-center">{{total_amount}}</h3>
             </div>
          </div>

          <div class="mb-16">
            <table class="w-full">
              <thead>
                <tr class="text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-gray-100">
                  <th class="py-4 text-left">Description</th>
                  <th class="py-4 text-center">Qty</th>
                  <th class="py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                {{items_table_modern}}
              </tbody>
            </table>
          </div>

          <div class="grid grid-cols-2 pt-12 items-end">
             <div>
                <p class="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2">Notes</p>
                <p class="text-sm italic opacity-60">{{notes}}</p>
             </div>
             <div class="space-y-2 text-right">
                <div class="text-sm opacity-50">Subtotal: {{subtotal}}</div>
                {{#if showGst}}<div class="text-sm opacity-50">Tax: {{tax_amount}}</div>{{/if}}
                <div class="text-sm opacity-50">Discount: -{{discount}}</div>
                <div class="text-4xl font-black mt-4 pt-4 border-t border-gray-50" style="color: var(--primary-color);">{{total_amount}}</div>
             </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'layout-minimal',
    name: 'Minimal Clean',
    type: 'minimal',
    html: `
      <div class="max-w-4xl mx-auto p-20 bg-white" style="color: var(--secondary-color); font-family: var(--font-family);">
        <div class="flex justify-between items-start mb-24">
          {{#if showLogo}}<div>{{clinic_logo}}</div>{{/if}}
          <div class="text-right">
            <p class="font-bold text-lg mb-1">{{clinic_name}}</p>
            <p class="text-sm opacity-50">{{clinic_phone}}</p>
          </div>
        </div>

        <div class="mb-24">
          <p class="text-xs opacity-40 uppercase tracking-widest mb-12">INVOICE {{invoice_number}} / {{date}}</p>
          <div class="grid grid-cols-2 gap-20">
             <div>
                <p class="text-xs opacity-40 mb-2 uppercase">Bill to</p>
                <p class="font-medium text-lg">{{patient_name}}</p>
                {{#if showPatientId}}<p class="text-xs opacity-50 mt-1">ID: {{patient_id}}</p>{{/if}}
             </div>
             {{#if showDoctor}}
             <div class="text-right">
                <p class="text-xs opacity-40 mb-2 uppercase">Physician</p>
                <p class="font-medium text-lg">Dr. {{doctor_name}}</p>
             </div>
             {{/if}}
          </div>
        </div>

        <div class="mb-24">
          <table class="w-full">
            <tbody class="divide-y divide-gray-100">
               {{items_table_minimal}}
            </tbody>
          </table>
        </div>

        <div class="flex flex-col items-end gap-2 text-right">
           <div class="text-xs opacity-40">Total Amount</div>
           <div class="text-5xl font-medium tracking-tighter" style="color: var(--primary-color);">{{total_amount}}</div>
           <div class="text-[10px] opacity-30 mt-12">Thank you for visiting {{clinic_name}}.</div>
        </div>
      </div>
    `
  },
  {
    id: 'layout-thermal',
    name: 'Thermal Receipt (80mm)',
    type: 'thermal',
    html: `
      <div class="p-4 font-mono text-[11px]" style="color: black; font-family: monospace; width: 80mm; background: white;">
        <div class="text-center mb-4 border-b pb-2 border-black border-dashed">
          <p class="font-bold text-sm uppercase">{{clinic_name}}</p>
          <p class="text-[10px]">{{clinic_address}}</p>
          <p class="text-[10px]">Ph: {{clinic_phone}}</p>
        </div>

        <div class="mb-4 text-[10px]">
          <div class="flex justify-between"><span>INV:</span><span>{{invoice_number}}</span></div>
          <div class="flex justify-between"><span>DATE:</span><span>{{date}}</span></div>
          <div class="flex justify-between"><span>PATIENT:</span><span>{{patient_name}}</span></div>
        </div>

        <div class="border-b border-black border-dashed mb-4 pb-2">
            {{items_table_thermal}}
        </div>

        <div class="text-right space-y-1">
           <div class="flex justify-between"><span>Subtotal:</span><span>{{subtotal}}</span></div>
           {{#if showGst}}<div class="flex justify-between"><span>GST:</span><span>{{tax_amount}}</span></div>{{/if}}
           <div class="flex justify-between"><span>Disc:</span><span>-{{discount}}</span></div>
           <div class="flex justify-between font-bold text-sm pt-2 border-t border-black border-dashed">
              <span>TOTAL:</span>
              <span>{{total_amount}}</span>
           </div>
        </div>

        <div class="text-center mt-8 pt-4 border-t border-black border-dashed opacity-50 uppercase">
           Get well soon!
        </div>
      </div>
    `
  }
];

export const CLINIC_THEMES = [
  {
    id: 'theme-healthcare-blue',
    name: 'Healthcare Blue',
    primary: '#3b82f6',
    secondary: '#1e293b',
    font: 'Inter'
  },
  {
    id: 'theme-medical-green',
    name: 'Clinic Green',
    primary: '#10b981',
    secondary: '#064e3b',
    font: 'Roboto'
  },
  {
    id: 'theme-royal-purple',
    name: 'Royal Purple',
    primary: '#8b5cf6',
    secondary: '#2e1065',
    font: 'Montserrat'
  },
  {
    id: 'theme-pediatric-rose',
    name: 'Soft Rose',
    primary: '#f43f5e',
    secondary: '#4c0519',
    font: 'Outfit'
  },
  {
    id: 'theme-dental-slate',
    name: 'Dark Slate',
    primary: '#334155',
    secondary: '#0f172a',
    font: 'Inter'
  }
];
