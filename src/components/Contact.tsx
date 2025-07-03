import React, { useState, useRef, useEffect } from 'react';
import { Send, Mail, Phone, MapPin, Loader, Check, AlertCircle } from 'lucide-react';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import emailjs from '@emailjs/browser';
import logger from '../utils/logger';

interface ContactProps {
  darkMode: boolean;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

const Contact: React.FC<ContactProps> = ({ darkMode }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    user_email: '',
    subject: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(sectionRef, { threshold: 0.1 });

  // Configure EmailJS settings
  useEffect(() => {
    // Initialize EmailJS with your public key - this is safe to expose in client-side code
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "LlOc8KGkyJkTM8C9q";
    
    logger.log('emailjs', 'Initializing EmailJS with public key starting with:', publicKey.substring(0, 4) + '...');
    
    emailjs.init({
      publicKey: publicKey
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');
    setErrorMessage('');

    try {
      if (!formRef.current) {
        throw new Error('Form reference is not available');
      }

      // Get EmailJS configuration
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_j1bmkua';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_goxd7lp';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'LlOc8KGkyJkTM8C9q';
      
      // Log form fields for debugging
      const nameInput = formRef.current.querySelector('[name="user_name"]') as HTMLInputElement;
      const emailInput = formRef.current.querySelector('[name="user_email"]') as HTMLInputElement;
      const subjectInput = formRef.current.querySelector('[name="subject"]') as HTMLInputElement;
      const messageInput = formRef.current.querySelector('[name="message"]') as HTMLTextAreaElement;
      
      const formFields = {
        name: nameInput?.value || '',
        email: emailInput?.value || '',
        subject: subjectInput?.value || '',
        message: messageInput?.value || '',
      };
      
      console.log('Sending email with:', {
        serviceId,
        templateId,
        publicKey: publicKey.substring(0, 4) + '...',
        formFields,
      });
      
      // Send email using EmailJS via form - no need for user_id in V3
      const response = await emailjs.sendForm(
        serviceId,
        templateId,
        formRef.current
      );

      if (response.status === 200) {
        handleSuccess();
      } else {
        throw new Error('Failed to send message. Please try again later.');
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleSuccess = () => {
    setFormStatus('success');
    setFormData({ user_name: '', user_email: '', subject: '', message: '' });
    setTimeout(() => setFormStatus('idle'), 5000);
  };

  const handleError = (error: unknown) => {
    console.error('Error sending email:', error);
    
    // Get current EmailJS configuration for debugging
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_j1bmkua';
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_goxd7lp';
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'LlOc8KGkyJkTM8C9q';
    
    console.log('Current EmailJS config:', { 
      serviceId: serviceId.substring(0, 5) + '...',
      templateId: templateId.substring(0, 5) + '...',
      publicKey: publicKey.substring(0, 5) + '...' 
    });
    
    let errorMessage = 'Failed to send message. Please try again later.';
    
    if (error instanceof Error) {
      // Add more details for debugging
      errorMessage = `${error.message}${error.stack ? ` (${error.stack.split('\n')[0]})` : ''}`;
      
      // Check for common EmailJS errors with more specific instructions
      if (error.message.includes('404')) {
        errorMessage = `Service/Template not found: Please verify your EmailJS service ID (${serviceId}) and template ID (${templateId}) in the EmailJS dashboard. See EMAILJS_SETUP_GUIDE.md for instructions.`;
      } else if (error.message.includes('401')) {
        errorMessage = `Authentication error: Your EmailJS public key may be incorrect. Verify it in your EmailJS account settings. Current key starts with: ${publicKey.substring(0, 4)}...`;
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error: Please check your internet connection.';
      }
    }
    
    setFormStatus('error');
    setErrorMessage(errorMessage);
    setTimeout(() => {
      setFormStatus('idle');
      setErrorMessage('');
    }, 20000); // Extended timeout to give more time to read the error
  };

  const contactInfo = [
    {
      icon: <Mail className="w-5 h-5" />,
      title: 'Email',
      details: 'vikash.jmbox@gmail.com',
      link: 'mailto:vikash.jmbox@gmail.com',
      color: darkMode ? 'text-blue-400' : 'text-blue-600',
      bgColor: darkMode ? 'bg-blue-900/20' : 'bg-blue-100'
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: 'Phone',
      details: '+91 95663 41933',
      link: 'tel:+919566341933',
      color: darkMode ? 'text-green-400' : 'text-green-600',
      bgColor: darkMode ? 'bg-green-900/20' : 'bg-green-100'
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: 'Location',
      details: 'Coimbatore, India',
      link: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3917.3996554989603!2d76.97694229999999!3d10.933153!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba85a5b0a224951%3A0xae661c49913444c0!2sRathinam%20Technical%20Campus!5e0!3m2!1sen!2sin!4v1745420055937!5m2!1sen!2sin?=Coimbatore,India',
      color: darkMode ? 'text-red-400' : 'text-red-600',
      bgColor: darkMode ? 'bg-red-900/20' : 'bg-red-100'
    }
  ];

  // EmailJS status indicator
  const EmailServiceIndicator = () => {
    return (
      <div className="flex items-center">
        <div className="h-3 w-3 rounded-full mr-2 bg-green-500"></div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
        </span>
      </div>
    );
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={`py-24 ${darkMode
        ? 'bg-gradient-to-b from-gray-800 to-gray-900'
        : 'bg-gradient-to-b from-gray-100 to-white'}`}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className={`text-center mb-16 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gradient">
            Get In Touch
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-teal-400 mx-auto mb-8"></div>
          <p className="text-lg max-w-3xl mx-auto dark:text-gray-300">
            Have a project in mind or want to discuss cybersecurity solutions? I'm just a message away.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className={`lg:col-span-2 transition-all duration-700 transform ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 h-full">
              <h3 className="text-2xl font-bold mb-6 dark:text-white text-center">Contact Information</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 text-justify">
                Feel free to reach out through any of these channels. I typically respond within 24 hours.
              </p>

              <div className="space-y-6">
                {contactInfo.map((info) => (
                  <a
                    key={info.title}
                    href={info.link}
                    className="flex items-start space-x-4 group"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className={`p-3 rounded-full ${info.bgColor} ${info.color} transform transition-all duration-300 group-hover:scale-110`}>
                      {info.icon}
                    </div>
                    <div>
                      <h4 className="font-medium dark:text-white">{info.title}</h4>
                      <p className={`${info.color} transition-all duration-300 group-hover:translate-x-1`}>{info.details}</p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-12">
                <h4 className="text-lg font-semibold mb-4 dark:text-white">Connect with me</h4>
                <div className="flex space-x-4">
                  <a
                    href="https://github.com/Vikash888"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-all duration-300 transform hover:scale-110`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className={darkMode ? 'text-white' : 'text-gray-700'}>
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                  <a
                    href="https://linkedin.com/in/vikashmca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-all duration-300 transform hover:scale-110`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className={darkMode ? 'text-white' : 'text-gray-700'}>
                      <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                    </svg>
                  </a>
                  <a
                    href="https://x.com/VIKASHJ61079581"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-all duration-300 transform hover:scale-110`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className={darkMode ? 'text-white' : 'text-gray-700'}>
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className={`lg:col-span-3 transition-all duration-700 transform ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
              <div className="flex justify-center items-center mb-6">
                <h3 className="text-2xl font-bold dark:text-white text-center">Send Me a Message</h3>
                <div className="absolute right-8">
                  <EmailServiceIndicator />
                </div>
              </div>

              {formStatus === 'success' ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 flex items-center">
                  <div className="bg-green-100 dark:bg-green-800 rounded-full p-2 mr-4">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-400">Message sent successfully!</h4>
                    <p className="text-green-700 dark:text-green-300 mt-1">Thank you for reaching out. I'll get back to you soon.</p>
                  </div>
                </div>
              ) : formStatus === 'error' ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex items-start">
                  <div className="bg-red-100 dark:bg-red-800 rounded-full p-2 mr-4">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-400">Error</h4>
                    <p className="text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
                    <p className="text-red-700 dark:text-red-300 mt-2 text-sm">
                      <strong>Troubleshooting:</strong> Please check your internet connection and try again. 
                      If the problem persists, please contact me directly via email.
                    </p>
                  </div>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block mb-2 text-gray-700 dark:text-gray-300">Name</label>
                      <input
                        type="text"
                        name="user_name"
                        value={formData.user_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-gray-700 dark:text-gray-300">Email</label>
                      <input
                        type="email"
                        name="user_email"
                        value={formData.user_email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your email"
                        required
                      />
                      {/* Hidden input for email template */}
                      <input type="hidden" name="reply_email" value={formData.user_email} />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-300">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Subject of your message"
                      required
                    />
                    {/* Hidden inputs for EmailJS template variables */}
                    <input type="hidden" name="email_subject" value={formData.subject} />
                    <input type="hidden" name="time" value={new Date().toLocaleString()} />
                  </div>

                  <div>
                    <label className="block mb-2 text-gray-700 dark:text-gray-300">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your message"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === 'submitting'}
                    className={`flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 ${
                      formStatus === 'submitting'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 hover:shadow-lg'
                    }`}
                  >
                    {formStatus === 'submitting' ? (
                      <>
                        <Loader className="animate-spin w-5 h-5 mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;