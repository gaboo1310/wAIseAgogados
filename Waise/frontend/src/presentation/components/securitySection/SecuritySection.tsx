import './securitySection.css';

const SecuritySection = () => {
  return (
    <div className="security-section">
      <div className="top-left-words2">▪ ACCESO SEGURO</div>
      <h3>
        Seguridad basada en <img src="/iconos/Logo AWS.png" alt="icono" className="aws-logo" />
      </h3>
      <div className="security-items">
        <div>
          <h4>Seguridad y Cumplimiento</h4>
          <p>
            AWS ofrece seguridad robusta, protegiendo datos y<br /> asegurando el cumplimiento con normativas globales.
          </p>
        </div>
        <div>
          <h4>
            Barreras de protección<br />personalizadas para IA
          </h4>
          <p>
            Los modelos fundacionales de la solución, líderes del mercado<br /> (Anthropic, Meta, Mistral, entre otros), ofrecen resistencia<br /> avanzada contra la manipulación y el uso indebido.
          </p>
        </div>
        <div>
          <h4>
            Integración con Amazon<br />Bedrock
          </h4>
          <p>
            Los datos no entrenan modelos LLM y permanecen en la<br /> región de AWS, cumpliendo normativas RGPD, SOC, ISO y CSA.
          </p>
        </div>
        <div>
          <h4>
            Monitoreo y Auditoría en tiempo<br /> real
          </h4>
          <p>
            Medidas proactivas detectan amenazas y vulnerabilidades,<br /> permitiendo respuestas ágiles para proteger la seguridad y<br /> confidencialidad de los datos.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SecuritySection;
