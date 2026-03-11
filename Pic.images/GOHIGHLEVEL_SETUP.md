# GoHighLevel Integration Guide for Master Scapes

## Current Status
✅ Website design complete  
⚠️ **GoHighLevel form integration needed**

## What Needs to Be Done

### 1. Set Up GoHighLevel Webhook

In your GoHighLevel account:
1. Go to **Settings** → **Custom Values** → **Webhooks**
2. Create a new webhook for "Master Scapes Contact Form"
3. Copy the webhook URL (looks like: `https://services.leadconnectorhq.com/hooks/...`)

### 2. Update Contact Form

The contact form in `index.html` needs JavaScript to submit to GoHighLevel instead of the default HTML submission.

**Current form** (lines 208-224):
```html
<form class="contact-form">
    <h3>Request a Consultation</h3>
    <input type="text" placeholder="Your Name *" required>
    <input type="email" placeholder="Your Email *" required>
    <input type="tel" placeholder="Your Phone *" required>
    <select required>
        <option value="">Service Interested In *</option>
        ...
    </select>
    <textarea placeholder="Project Details *" required></textarea>
    <button type="submit" class="btn btn-primary">Request Consultation</button>
</form>
```

**Needs to be updated to:**
```html
<form class="contact-form" id="masterScapesForm">
    <h3>Request a Consultation</h3>
    <input type="text" name="name" placeholder="Your Name *" required>
    <input type="email" name="email" placeholder="Your Email *" required>
    <input type="tel" name="phone" placeholder="Your Phone *" required>
    <select name="service" required>
        <option value="">Service Interested In *</option>
        ...
    </select>
    <textarea name="message" placeholder="Project Details *" required></textarea>
    <button type="submit" class="btn btn-primary">Request Consultation</button>
    <div class="form-response" style="display:none;"></div>
</form>
```

### 3. Add GoHighLevel JavaScript

Add to `script.js` (around line 60):

```javascript
// GoHighLevel Form Integration
const masterScapesForm = document.getElementById('masterScapesForm');

if (masterScapesForm) {
    masterScapesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(masterScapesForm);
        const data = Object.fromEntries(formData);
        
        // Replace with YOUR GoHighLevel webhook URL
        const WEBHOOK_URL = 'YOUR_GOHIGHLEVEL_WEBHOOK_URL_HERE';
        
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                // Success message
                const responseDiv = masterScapesForm.querySelector('.form-response');
                responseDiv.style.display = 'block';
                responseDiv.style.color = '#d7a887';
                responseDiv.style.padding = '20px';
                responseDiv.style.marginTop = '20px';
                responseDiv.style.background = '#1a2530';
                responseDiv.style.textAlign = 'center';
                responseDiv.innerHTML = '<strong>Thank you!</strong> We\'ll contact you within 24 hours.';
                
                masterScapesForm.reset();
                
                setTimeout(() => {
                    responseDiv.style.display = 'none';
                }, 5000);
            } else {
                throw new Error('Form submission failed');
            }
        } catch (error) {
            const responseDiv = masterScapesForm.querySelector('.form-response');
            responseDiv.style.display = 'block';
            responseDiv.style.color = '#ff4444';
            responseDiv.innerHTML = 'Error submitting form. Please try again.';
        }
    });
}
```

### 4. Optional: Add Field Mapping

If you want custom field mapping in GoHighLevel:

```javascript
// Custom field mapping for GoHighLevel
const leadData = {
    contact: {
        first_name: data.name.split(' ')[0],
        last_name: data.name.split(' ').slice(1).join(' ') || '',
        email: data.email,
        phone: data.phone,
    },
    tags: ['Master Scapes Website', data.service],
    notes: data.message,
    source: 'Website Contact Form'
};
```

## Quick Setup Steps

### Option 1: Copy from Enhance Landscape
The Enhance Landscape website has similar form setup. You can:
1. Copy the form handling code from Enhance Landscape's `script.js`
2. Update the webhook URL
3. Adjust field names if needed

### Option 2: I Can Set It Up
Just provide me with:
1. Your GoHighLevel webhook URL
2. Any custom field mappings you want
3. Whether you want any automation triggers

And I'll integrate it for you!

## Additional GoHighLevel Features

### Recommended Setup:
- ✅ **Lead Capture** - Form submissions create contacts
- ✅ **Auto-Response** - Send confirmation email
- ✅ **Tags** - Auto-tag leads by service type
- ✅ **Workflow** - Trigger follow-up sequence
- ✅ **Notifications** - Alert your team

### Advanced Options:
- SMS notifications to your phone
- Calendar booking integration
- AI chatbot for instant responses
- Multi-step form for qualification
- A/B testing form variations

## Testing

After integration:
1. Submit a test form entry
2. Check GoHighLevel for new contact
3. Verify all fields map correctly
4. Test automation workflows

## Notes
- Form currently uses HTML5 validation
- All fields are marked required
- Design matches CalFit's dark theme
- Mobile responsive
- Smooth scroll to confirmation

---

**Ready to integrate?** Just give me your GoHighLevel webhook URL and I'll set it up in 2 minutes!
